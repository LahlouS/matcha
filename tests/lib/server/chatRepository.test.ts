import { describe, expect } from 'vitest';
import { itWithFixtures } from '../../fixtures';

describe('chatRepository', () => {
	itWithFixtures('Can create and return chats', async ({ chatRepository, savedUserFactory }) => {
		const users = await savedUserFactory(2);

		await chatRepository.createChat(users[0].id, users[1].id);

		let chats = await chatRepository.chatsForUser(users[0].id);
		expect(chats).toEqual([
			{
				id: 1,
				userOne: users[0].id,
				userTwo: users[1].id,
				messages: []
			}
		]);
		chats = await chatRepository.chatsForUser(users[1].id);
		expect(chats).toEqual([
			{
				id: 1,
				userOne: users[0].id,
				userTwo: users[1].id,
				messages: []
			}
		]);
	});

	itWithFixtures('chats are sorted by latest', async ({ chatRepository, savedUserFactory }) => {
		const users = await savedUserFactory(2);
		const chat = await chatRepository.createChat(users[0].id, users[1].id);
		await chatRepository.saveMessage(chat.id, users[0].id, 'send nudes');
		await chatRepository.saveMessage(chat.id, users[0].id, 'send more nudes');

		let chats = await chatRepository.chatsForUser(users[0].id);

		let latest = chats[0];
		expect(latest.messages[0]).toStrictEqual({
			id: expect.any(Number),
			message: 'send more nudes',
			senderId: users[0].id,
			chatId: expect.any(Number),
			sentAt: expect.any(Date)
		});
		chats = await chatRepository.chatsForUser(users[1].id);
		latest = chats[0];
		expect(latest.messages[0]).toStrictEqual({
			id: expect.any(Number),
			chatId: expect.any(Number),
			message: 'send more nudes',
			senderId: users[0].id,
			sentAt: expect.any(Date)
		});
	});

	itWithFixtures('Can save a message to a chat', async ({ chatRepository, savedUserFactory }) => {
		const users = await savedUserFactory(2);
		const createdChat = await chatRepository.createChat(users[0].id, users[1].id);

		const text = 'send nudes';
		const result = await chatRepository.saveMessage(createdChat.id, users[0].id, text);
		const chat = await chatRepository.chat(createdChat.id);

		expect(result).toEqual({
			chatId: createdChat.id,
			id: expect.any(Number),
			sender: users[0].id,
			message: text,
			sentAt: expect.any(Date)
		});
		expect(chat.messages).toEqual([
			{
				id: 1,
				senderId: users[0].id,
				message: 'send nudes',
				sentAt: expect.any(Date)
			}
		]);
	});
});
