import type { Database } from 'better-sqlite3';
import type { Chat, Message } from '$lib/domain/chat';
import { parse } from 'date-fns';
import { SqliteError } from 'better-sqlite3';
import _ from 'lodash';

export class ChatRepositoryError extends Error {
	exception: unknown;
	constructor(message: string, exception: unknown) {
		super(message);
		this.name = 'ChatRepositoryError';
		this.exception = exception;
	}
}

export class ChatRepository {
	constructor(private db: Database) {}

	public async createChat(userOneId: string, userTwoId: string): Promise<Chat> {
		return new Promise((resolve, reject) => {
			try {
				const result = this.db
					.prepare<[string, string], Chat>(
						`INSERT INTO chat (user_id_1, user_id_2)
						VALUES (?, ?)
						RETURNING id, user_id_1 as userOne, user_id_2 as userTwo`
					)
					.get(userOneId, userTwoId);
				result!.messages = [];
				resolve(result!);
			} catch (e) {
				if (e instanceof SqliteError) {
					if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
						const regex = /users\.(.*)/;
						const match = e.message.match(regex);
						if (!match) {
							reject(
								new ChatRepositoryError(
									`Something went wrong creating chat for users: ${userOneId} and ${userTwoId}`,
									e
								)
							);
						}
						reject(
							new ChatRepositoryError(`Duplicate entry for users: ${userOneId} and ${userTwoId}`, e)
						);
					}
				}
				reject(
					new ChatRepositoryError(
						`Something went wrong creating chat for users: ${userOneId} and ${userTwoId}`,
						e
					)
				);
			}
		});
	}

	public async deleteChatBetweenUsers(userOneId: string, userTwoId: string): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				this.db
					.prepare<[string, string, string, string], { changes: number }>(
						`DELETE FROM chat
                    WHERE (user_id_1 = ? AND user_id_2 = ?)
                    OR (user_id_1 = ? AND user_id_2 = ?)`
					)
					.run(userOneId, userTwoId, userTwoId, userOneId);
				resolve();
			} catch (e) {
				reject(
					new ChatRepositoryError(
						`Something went wrong deleting chat between users: ${userOneId} and ${userTwoId}`,
						e
					)
				);
			}
		});
	}

	public async chatsForUser(userId: string): Promise<Chat[]> {
		return new Promise((resolve, reject) => {
			try {
				const transaction = this.db.transaction((userId) => {
					const chats = this.db
						.prepare<[string, string], { id: number; user_id_1: string; user_id_2: string }>(
							`SELECT id, user_id_1, user_id_2
							FROM chat
							WHERE user_id_1 = ? OR user_id_2 = ?`
						)
						.all(userId, userId);
					const mapped: Chat[] = chats
						.map((chat) => {
							return {
								id: chat.id,
								userOne: chat.user_id_1,
								userTwo: chat.user_id_2
							};
						})
						.map((chat) => {
							const snakeCaseMessage = this.db
								.prepare<
									[number],
									{ id: number; message: string; sender: string; sent_at: string }
								>(
									`SELECT id, sender_id, message, sent_at, chat_id
							FROM messages
							WHERE chat_id = ?
							ORDER BY sent_at DESC`
								)
								.all(chat.id);
							const messages = snakeCaseMessage.map((message) => {
								const date = parse(message.sent_at, 'yyyy-MM-dd HH:mm:ss', new Date());
								return {
									..._.mapKeys(message, (value, key) => _.camelCase(key)),
									sentAt: date
								} as unknown as Message;
							});
							return {
								...chat,
								messages
							};
						});
					resolve(mapped);
				});
				transaction(userId);
			} catch {
				reject(
					new ChatRepositoryError(`Something went wrong fetching chats for user: ${userId}`, null)
				);
			}
		});
	}

	public async saveMessage(chatId: number, userId: string, message: string): Promise<Message> {
		return new Promise((resolve, reject) => {
			try {
				const result = this.db
					.prepare<
						[number, string, string],
						{ id: number; chatId: number; sender: string; message: string; sentAt: string }
					>(
						`INSERT INTO messages (chat_id, sender_id, message)
						VALUES (?, ?, ?)
						RETURNING id, chat_id as chatId, sender_id as sender, message, sent_at as sentAt`
					)
					.get(chatId, userId, message);
				const date = parse(result!.sentAt, 'yyyy-MM-dd HH:mm:ss', new Date());
				resolve({
					...result!,
					sentAt: date
				});
			} catch (e) {
				reject(
					new ChatRepositoryError(`Something went wrong fetching chats for user: ${userId}`, null)
				);
			}
		});
	}

	public async chat(chatId: number): Promise<Chat> {
		return new Promise((resolve, reject) => {
			try {
				const transaction = this.db.transaction((chatId) => {
					const snakeCaseChat = this.db
						.prepare<[number], { id: number; user_id_1: string; user_id_2: string }>(
							`SELECT id, user_id_1, user_id_2
							FROM chat
							WHERE id = ?`
						)
						.get(chatId);
					const chat = _.mapKeys(snakeCaseChat, (value, key) => {
						_.camelCase(key);
					}) as unknown as Chat;
					if (!snakeCaseChat) {
						reject(new ChatRepositoryError(`No chat found for id: ${chatId}`, null));
					}
					const snakeCaseMessages = this.db
						.prepare<[number], { id: number; message: string; sender: string; sent_at: string }>(
							`SELECT id, sender_id, message, sent_at
							FROM messages
							WHERE chat_id = ?
							ORDER BY sent_at DESC`
						)
						.all(chatId);
					const messages = snakeCaseMessages.map((message) => {
						const date = parse(message.sent_at, 'yyyy-MM-dd HH:mm:ss', new Date());
						return {
							..._.mapKeys(message, (value, key) => _.camelCase(key)),
							sentAt: date
						};
					}) as unknown as Message[];
					resolve({
						...chat,
						messages
					});
				});
				transaction(chatId);
			} catch (e) {
				console.error(e);
				reject(new ChatRepositoryError(`Something went wrong fetching chat: ${chatId}`, null));
			}
		});
	}
}
