import type { Socket } from 'socket.io-client';
import {
	chatFromSerializable,
	type Chat,
	type ChatPreview,
	type Message,
	type SerializableChat
} from './domain/chat';
import { type Writable } from 'svelte/store';

export class ChatClientError extends Error {
	exception: unknown;
	constructor(message: string, exception: unknown) {
		super(message);
		this.name = 'ChatClientError';
		this.exception = exception;
	}
}
export class ChatClient {
	public loading = true;
	id: number;

	constructor(
		private client: Socket,
		private chats: Writable<Map<number, Chat>>
	) {
		this.id = Math.random();
		this.onMessage();
		this.onConnectionError();
		this.fetchChats();
		this.onDeleteChat();
		this.onNewChat();
	}

	private onMessage() {
		this.client.on('message', (arg: { chatId: number; message: Message }) => {
			this.chats.update((currentChats) => {
				const chat = currentChats.get(arg.chatId);
				if (chat) {
					chat.messages.push(arg.message);
				}
				return new Map(currentChats);
			});
		});
	}

	private onNewChat() {
		this.client.on('newChat', (chat: SerializableChat) => {
			this.chats.update((currentChats) => {
				currentChats.set(chat.id, chatFromSerializable(chat));
				return new Map(currentChats);
			});
		});
	}

	private async fetchChats() {
		this.client.emit('fetchChats');
		this.client.once('fetchChatsResponse', (response: Chat[]) => {
			this.chats.set(new Map(response.map((chat: Chat) => [chat.id, chat])));
			this.loading = false;
		});
	}

	private onConnectionError() {
		this.client.on('connect_error', (error) => {
			console.error('connection error: ' + error);
		});
	}

	private onDeleteChat() {
		this.client.on('deleteChat', ({ id }) => {
			this.chats.update((currentChats) => {
				const chatToDelete = Array.from(currentChats.values()).find(
					(chat) => chat.userOne === id || chat.userTwo === id
				);

				if (chatToDelete) {
					const newChats = new Map(currentChats);
					newChats.delete(chatToDelete.id);
					return newChats;
				}

				return currentChats;
			});
		});
	}

	public messages(chatId: number): Message[] {
		let chat: undefined | Chat;
		const unsubscribe = this.chats.subscribe((chats) => (chat = chats.get(chatId)));
		unsubscribe(); // Clean up subscription
		if (!chat) {
			return [];
		}
		return chat.messages;
	}

	public async createChat(chatPartnerId: string): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				const timeout = setTimeout(() => {
					reject(new ChatClientError('Chat creation timeout', new Error('Timeout')));
				}, 5000);

				this.client.emit('createChat', { chatPartnerId }, (error: any) => {
					clearTimeout(timeout);
					if (error) {
						reject(new ChatClientError('Server rejected chat creation', error));
					} else {
						resolve();
					}
				});
			} catch (e) {
				reject(new ChatClientError('Something went wrong creating chat', e));
			}
		});
	}

	public chatPreviews(): ChatPreview[] {
		let previews: ChatPreview[] = [];
		this.chats.subscribe((chats) => {
			previews = Array.from(chats.values()).map((chat) => {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { messages, ...rest } = chat;
				return {
					...rest,
					lastMessage: chat.messages[chat.messages.length - 1]
				};
			});
		});
		return previews;
	}

	public sendMessage(userId: string, chatId: number, message: string) {
		const chat = this.chatPreviews().find((chat) => chat.id === chatId);
		if (!chat) {
			throw new ChatClientError('Chat not found', new Error(`Chat ${chatId} not found`));
		}
		const to = chat.userOne === userId ? chat.userTwo : chat.userOne;
		this.client.emit('sendMessage', { userId: userId, chatId, message, to });
	}

	public destroy() {
		this.client.off('message');
		this.client.off('deleteChat');
		this.client.off('fetchChatsResponse');
		this.client.off('connect_error');
		this.client.off('newChat');
	}
}
