import Database from 'better-sqlite3';
import { parse } from 'date-fns';
import { SqliteError } from 'better-sqlite3';
import _ from 'lodash';

const DATABASE_PATH = 'database/database.db';
let db = null;
function getDb(path = DATABASE_PATH) {
	if (!db) {
		db = Database(path);
	}
	return db;
}

db = getDb(DATABASE_PATH);

export class ChatRepositoryError extends Error {
	exception;
	constructor(message, exception) {
		super(message);
		this.name = 'ChatRepositoryError';
		this.exception = exception;
	}
}

export async function saveMessage(chatId, userId, message) {
	return new Promise((resolve, reject) => {
		try {
			const result = db
				.prepare(
					`INSERT INTO messages (chat_id, sender_id, message)
                    VALUES (?, ?, ?)
                    RETURNING id, chat_id as chatId, sender_id as sender, message, sent_at as sentAt`
				)
				.get(chatId, userId, message);
			const date = parse(result.sentAt, 'yyyy-MM-dd HH:mm:ss', new Date());
			resolve({
				...result,
				sentAt: date
			});
		} catch (e) {
			console.log('LLZLZLZLZLZLZL', e);
			reject(
				new ChatRepositoryError(`Something went wrong fetching chats for user: ${userId}`, null)
			);
		}
	});
}

export async function chatsForUser(userId) {
	return new Promise((resolve, reject) => {
		try {
			const transaction = db.transaction((userId) => {
				const chats = db
					.prepare(
						`SELECT id, user_id_1, user_id_2
                        FROM chat
                        WHERE user_id_1 = ? OR user_id_2 = ?`
					)
					.all(userId, userId);
				const mapped = chats
					.map((chat) => {
						return {
							id: chat.id,
							userOne: chat.user_id_1,
							userTwo: chat.user_id_2
						};
					})
					.map((chat) => {
						const snakeCaseMessage = db
							.prepare(
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
							};
						});
						return {
							...chat,
							messages
						};
					});
				resolve(mapped);
			});
			transaction(userId);
		} catch (e) {
			console.log('LELELELELEL', e);
			reject(
				new ChatRepositoryError(`Something went wrong fetching chats for user: ${userId}`, null)
			);
		}
	});
}

export async function createChat(userOneId, userTwoId) {
	return new Promise((resolve, reject) => {
		try {
			const result = db
				.prepare(
					`INSERT INTO chat (user_id_1, user_id_2)
                    VALUES (?, ?)
                    RETURNING id, user_id_1 as userOne, user_id_2 as userTwo`
				)
				.get(userOneId, userTwoId);
			result.messages = [];
			resolve(result);
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
