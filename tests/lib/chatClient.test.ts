import { describe, expect } from 'vitest';
import { DEFAULT_PASSWORD, itWithFixtures } from '../fixtures';
import { getConnectedUser } from './server/notificationService.test';
import type { AddressInfo } from 'net';
import { io } from 'socket.io-client';
import { ChatClient } from '$lib/chatClient';
import type { Chat, ChatPreview } from '$lib/domain/chat';
import type { HttpServer } from 'vite';
import type { AuthService } from '$lib/server/authService';
import type { UserWithoutProfileSetup } from '$lib/userRepository';

function chatToPreview(chat: Chat): ChatPreview {
	return {
		id: chat.id,
		userOne: chat.userOne,
		userTwo: chat.userTwo,
		lastMessage: chat.messages[chat.messages.length - 1]
	};
}

function areChatPreviewsSame(a: ChatPreview, b: ChatPreview) {
	return (
		a.id === b.id &&
		(a.userOne === b.userOne || a.userOne === b.userTwo) &&
		(a.userTwo === b.userOne || a.userTwo === b.userTwo) &&
		a.lastMessage === b.lastMessage
	);
}

async function createChatClient(
	user: UserWithoutProfileSetup,
	authService: AuthService,
	httpServer: HttpServer
) {
	const port = (httpServer.address() as AddressInfo).port;
	const token = await authService.signIn(user.username, DEFAULT_PASSWORD);
	const socket = io(`http://localhost:${port}`, {
		auth: {
			token: token.value
		}
	});
	return new ChatClient(socket, user.id);
}

describe('chatClient', () => {
	// keep serversocket
	itWithFixtures(
		'should fetch chats that already exist',
		async ({ httpServer, savedUserFactory, chatRepository, authService, serverSocket }) => {
			const [user, other] = await savedUserFactory(2);
			const chat = await chatRepository.createChat(user.id, other.id);
			const chatClient = await createChatClient(user, authService, httpServer);

			while (chatClient.loading) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
			const found = chatClient.chatPreviews();

			expect(found).toEqual([chatToPreview(chat)]);
		}
	);

	// keep serversocket
	itWithFixtures(
		'should receive new chats',
		async ({ savedUserFactory, chatClient, clientSocket, lucia, serverSocket }) => {
			const [other] = await savedUserFactory(2);
			const user = await getConnectedUser(clientSocket, lucia);
			while (chatClient.loading) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			let chats = chatClient.chatPreviews();
			expect(chats).toEqual([]);

			const chat = await chatClient.createChat(other.id);

			chats = chatClient.chatPreviews();
			expect(chats.length).toBe(1);
			expect(areChatPreviewsSame(chats[0], { id: chat.id, userOne: user.id, userTwo: other.id }));
		}
	);

	// keep serversocket
	itWithFixtures.only(
		'Unmatching removes the chat',
		async ({
			savedUserFactory,
			chatClient,
			authService,
			httpServer,
			serverSocket,
			connectionRepository
		}) => {
			const [other] = await savedUserFactory(2);
			const otherUserClient = await createChatClient(other, authService, httpServer);
			const chat = await chatClient.createChat(other.id);
			connectionRepository.flipLikeUser(chat.userOne, chat.userTwo);
			connectionRepository.flipLikeUser(chat.userTwo, chat.userOne);
			while (chatClient.loading) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			chatClient.sendMessage(chat.id, 'Hello');
			// might have to increase this delay if the test fails
			await new Promise((resolve) => setTimeout(resolve, 300));

			connectionRepository.flipLikeUser(chat.userOne, chat.userTwo);

			const chats = chatClient.chatPreviews();
			expect(chats).toHaveLength(0);
		}
	);

	// keep serversocket
	itWithFixtures(
		'Can send messages',
		async ({ savedUserFactory, chatClient, authService, httpServer, serverSocket }) => {
			const [other] = await savedUserFactory(2);
			const otherUserClient = await createChatClient(other, authService, httpServer);
			const chat = await chatClient.createChat(other.id);
			while (chatClient.loading) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			chatClient.sendMessage(chat.id, 'Hello');
			// might have to increase this delay if the test fails
			await new Promise((resolve) => setTimeout(resolve, 300));

			const messages = chatClient.messages(chat.id);
			expect(messages.length).toBe(1);
			expect(messages[0].message).toBe('Hello');

			const otherMessages = otherUserClient.messages(chat.id);
			expect(otherMessages.length).toBe(1);
			expect(otherMessages[0].message).toBe('Hello');
		}
	);

	// keep serversocket
	itWithFixtures(
		'other users do not see messages from other chats',
		async ({ savedUserFactory, chatClient, authService, httpServer, serverSocket }) => {
			const [other, randomUser] = await savedUserFactory(2);
			const randomUserClient = await createChatClient(randomUser, authService, httpServer);
			const chat = await chatClient.createChat(other.id);
			while (chatClient.loading) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			chatClient.sendMessage(chat.id, 'Hello');
			// might have to increase this delay if the test fails
			await new Promise((resolve) => setTimeout(resolve, 300));

			const otherMessages = randomUserClient.messages(chat.id);
			expect(otherMessages.length).toBe(0);
		}
	);
});
