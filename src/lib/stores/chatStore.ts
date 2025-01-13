import { socketStore } from './socketStore';
import { ChatClient } from '$lib/chatClient';
import { writable } from 'svelte/store';
import type { Chat } from '$lib/domain/chat';

export const chatStore = writable<Map<number, Chat>>(new Map());

function createChatClientStore() {
	const { subscribe, update } = writable<ChatClient | null>(null);

	const unsubscribe = socketStore.subscribe(({ socket }) => {
		update((currentClient) => {
			if (currentClient) {
				currentClient.destroy();
			}

			if (socket) {
				const client = new ChatClient(socket, chatStore);
				return client;
			} else {
				chatStore.update(() => new Map());
				return null;
			}
		});
	});

	return {
		subscribe,
		cleanup: () => {
			unsubscribe();
			update((client) => {
				if (client) {
					client.destroy();
				}
				chatStore.update(() => new Map());
				return null;
			});
		}
	};
}

export const chatClientStore = createChatClientStore();
