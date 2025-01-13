import { writable } from 'svelte/store';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

type SocketState = {
	socket: Socket | null;
	connected: boolean;
};

function createSocketStore() {
	const { subscribe, update } = writable<SocketState>({
		socket: null,
		connected: false
	});

	let currentSocket: Socket | null = null;

	const removeListeners = (socket: Socket) => {
		socket.off('connect');
		socket.off('disconnect');
	};

	return {
		subscribe,
		connect: (url: string, token: string) => {
			update(() => {
				if (currentSocket) {
					removeListeners(currentSocket);
					currentSocket.disconnect();
				}

				const socket = io(url, {
					auth: { token }
				});

				socket.on('connect', () => {
					update((s) => {
						return { ...s, connected: true };
					});
				});

				socket.on('disconnect', () => {
					update((s) => ({ ...s, connected: false }));
				});

				currentSocket = socket;

				return {
					socket,
					connected: socket.connected
				};
			});
		},
		disconnect: () => {
			update(() => {
				if (currentSocket) {
					removeListeners(currentSocket);
					currentSocket.disconnect();
					currentSocket = null;
				}
				return {
					socket: null,
					connected: false
				};
			});
		}
	};
}

export const socketStore = createSocketStore();
