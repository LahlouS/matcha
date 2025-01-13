import type { MatchStatus } from '$lib/domain/match';
import type { NotificationService } from '$lib/server/notificationService';
import type { Database } from 'better-sqlite3';
import type { ServerSocket } from './serverSocket';
import type { ChatRepository } from './chatRepository';
import { chatToSerializable, type Chat } from '$lib/domain/chat';

export class ConnectionRepositoryError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ConnectionRepositoryError';
	}
}

export class ConnectionRepository {
	constructor(
		private db: Database,
		private notificationService: NotificationService,
		private serverSocket: ServerSocket,
		private chatRepository: ChatRepository
	) {}

	public async flipLikeUser(userId: string, targetId: string): Promise<boolean> {
		const didUserAlreadyLike = this.db.prepare<[string, string], { id: number }>(
			'SELECT id FROM likes WHERE liker_id = ? AND liked_id = ?'
		);
		const insertLike = this.db.prepare<[string, string]>(
			'INSERT INTO likes (liker_id, liked_id) VALUES (?, ?)'
		);
		const didOtherUserLike = this.db.prepare<[string, string], string>(
			'SELECT * FROM likes WHERE liker_id = ? AND liked_id = ?'
		);
		const insertMatch = this.db.prepare<[string, string]>(
			`INSERT INTO connections (user_id_1, user_id_2, status)
				VALUES (?, ?, 'MATCHED')
				ON CONFLICT (user_id_1, user_id_2)
				DO UPDATE SET status = 'MATCHED';`
		);
		const setUnmatched = this.db.prepare<[string, string, string, string]>(
			"UPDATE connections SET status = 'UNMATCHED' WHERE  (user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?);"
		);
		const deleteLike = this.db.prepare<number>('DELETE FROM likes WHERE id = ?');
		return new Promise((resolve, reject) => {
			try {
				const transaction = this.db.transaction((userId: string, targetId: string) => {
					const maybeLikeId = didUserAlreadyLike.get(userId, targetId);
					if (!maybeLikeId) {
						insertLike.run(userId, targetId);
						const otherUserLike = didOtherUserLike.get(targetId, userId);
						if (otherUserLike) {
							insertMatch.run(userId, targetId);
							this.notificationService.sendNotification(targetId, 'MATCH', userId);
							this.notificationService.sendNotification(userId, 'MATCH', targetId);
							this.chatRepository.createChat(targetId, userId).then((chat) => {
								this.sendNewChatMessage(chat, userId, targetId);
							});
						} else {
							this.notificationService.sendNotification(targetId, 'LIKE', userId);
						}
						return true;
					} else {
						deleteLike.run(maybeLikeId.id);
						const result = setUnmatched.run(userId, targetId, targetId, userId);
						if (result.changes) {
							this.notificationService.sendNotification(targetId, 'UNMATCH', userId);
							this.notificationService.sendNotification(userId, 'UNMATCH', targetId);
							this.sendDeleteChatMessage(userId, targetId);
							this.chatRepository.deleteChatBetweenUsers(userId, targetId);
						} else {
							this.notificationService.sendNotification(targetId, 'UNLIKE', userId);
						}
						return false;
					}
				});
				const isLiked = transaction(userId, targetId);
				resolve(isLiked);
			} catch {
				reject(new ConnectionRepositoryError('Failed to like user'));
			}
		});
	}

	public async sendDeleteChatMessage(userId: string, targetId: string): Promise<void> {
		this.serverSocket.sendMessageToUser(targetId, 'deleteChat', { id: userId });
		this.serverSocket.sendMessageToUser(userId, 'deleteChat', { id: targetId });
	}

	public async sendNewChatMessage(chat: Chat, userId: string, targetId: string): Promise<void> {
		this.serverSocket.sendMessageToUser(targetId, 'newChat', chatToSerializable(chat));
		this.serverSocket.sendMessageToUser(userId, 'newChat', chatToSerializable(chat));
	}

	public async userLikedBy(id: string): Promise<string[]> {
		return new Promise((resolve, reject) => {
			try {
				const result = this.db
					.prepare<string, { liker_id: string }>('SELECT liker_id FROM likes WHERE liked_id = ?')
					.all(id);
				resolve(result.map((row) => row.liker_id));
			} catch {
				reject(new ConnectionRepositoryError('Failed to fetch users who liked user'));
			}
		});
	}

	public async isLikedBy(userId: string, targetId: string): Promise<boolean> {
		return new Promise((resolve, reject) => {
			try {
				const result = this.db
					.prepare<
						[string, string],
						{ liked_id: string }
					>('SELECT liked_id FROM likes WHERE liker_id = ? AND liked_id = ?')
					.get(userId, targetId);
				if (!result) {
					resolve(false);
				}
				resolve(true);
			} catch {
				reject(new ConnectionRepositoryError('Failed to check if user is liked by another user'));
			}
		});
	}

	public async likes(id: string): Promise<string[]> {
		return new Promise((resolve, reject) => {
			try {
				const result = this.db
					.prepare<string, { liked_id: string }>('SELECT liked_id FROM likes WHERE liker_id = ?')
					.all(id);
				resolve(result.map((row) => row.liked_id));
			} catch {
				reject(new ConnectionRepositoryError('Failed to fetch likes'));
			}
		});
	}

	public async matchStatus(userId: string, otherUserId: string): Promise<MatchStatus | null> {
		return new Promise((resolve, reject) => {
			try {
				const result = this.db
					.prepare<
						[string, string, string, string],
						{ status: string }
					>('SELECT status FROM connections WHERE (user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)')
					.get(userId, otherUserId, otherUserId, userId);
				if (!result) {
					resolve(null);
				}
				resolve({
					userOne: userId,
					userTwo: otherUserId,
					status: result!.status as 'MATCHED' | 'BLOCKED'
				});
			} catch {
				reject(new ConnectionRepositoryError('Failed to fetch match status'));
			}
		});
	}

	public async matchesForUser(id: string): Promise<MatchStatus[]> {
		return new Promise((resolve, reject) => {
			try {
				const result = this.db
					.prepare<
						[string, string],
						{ status: string; user_id_1: string; user_id_2: string }
					>(`SELECT status, user_id_1, user_id_2 FROM connections WHERE (user_id_1 = ? OR user_id_2 = ?) AND status = 'MATCHED'`)
					.all(id, id);
				const mapped = result.map((row) => {
					if (row.user_id_1 === id) {
						return {
							userOne: row.user_id_1,
							userTwo: row.user_id_2,
							status: row.status as 'MATCHED' | 'BLOCKED' | 'UNMATCHED'
						};
					}
					return {
						userOne: row.user_id_2,
						userTwo: row.user_id_1,
						status: row.status as 'MATCHED' | 'BLOCKED' | 'UNMATCHED'
					};
				});
				resolve(mapped);
			} catch {
				reject(new ConnectionRepositoryError('Failed to fetch matches'));
			}
		});
	}
}
