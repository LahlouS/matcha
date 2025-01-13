import { writable, type Unsubscriber } from 'svelte/store';
import { socketStore } from './socketStore';
import { NotificationClient } from '$lib/notificationClient';
import type { Notification } from '$lib/notificationClient';
import { notificationToToast } from '$lib/notificationClient';
import addToast from '$lib/toast/toastStore';

type NotificationState = {
	client: NotificationClient | null;
	subscription: any | null;
	socketStoreUnsubscribe: Unsubscriber | null;
};

function createNotificationStore() {
	const { subscribe, update } = writable<NotificationState>({
		client: null,
		subscription: null,
		socketStoreUnsubscribe: null
	});

	let currentSocketStoreUnsubscribe: Unsubscriber | null = null;

	currentSocketStoreUnsubscribe = socketStore.subscribe(({ socket }) => {
		update((state) => {
			if (state.subscription) {
				state.client?.unsubscribe(state.subscription);
			}

			if (socket) {
				const client = new NotificationClient(socket);
				const subscription = client.subscribe((notification: Notification) => {
					addToast(notificationToToast(notification));
				});
				return {
					client,
					subscription,
					socketStoreUnsubscribe: currentSocketStoreUnsubscribe
				};
			} else {
				return {
					client: null,
					subscription: null,
					socketStoreUnsubscribe: currentSocketStoreUnsubscribe
				};
			}
		});
	});

	return {
		subscribe,
		cleanup: () => {
			update((state) => {
				if (state.subscription) {
					state.client?.unsubscribe(state.subscription);
				}
				if (currentSocketStoreUnsubscribe) {
					currentSocketStoreUnsubscribe();
				}
				return {
					client: null,
					subscription: null,
					socketStoreUnsubscribe: null
				};
			});
		}
	};
}

export const notificationStore = createNotificationStore();
