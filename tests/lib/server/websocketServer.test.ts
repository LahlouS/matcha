import { afterEach, describe } from 'vitest';
import { io, type Socket as ClientSocket } from 'socket.io-client';
import { DEFAULT_PASSWORD, itWithFixtures } from '../../fixtures';
import type { AddressInfo } from 'net';

describe('WebsocketServer', () => {
	let socket: ClientSocket | null = null;

	afterEach(() => {
		socket?.disconnect();
		socket = null;
	});

	// Dont remove websocket since we need to set it up
	itWithFixtures(
		'Should not be able to connect without session',
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		async ({ httpServer }) => {
			const port = (httpServer.address() as AddressInfo).port;
			socket = io(`http://localhost:${port}`);

			await new Promise((resolve, reject) => {
				socket!.on('connect_error', () => resolve(null));
				socket!.on('connect', () =>
					reject(new Error('Expected connect_error but connected successfully'))
				);
			});
		}
	);

	// Dont remove websocket since we need to set it up
	itWithFixtures(
		'Should be able to connect with session',
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		async ({ httpServer, serverSocket, authService, savedUserFactory }) => {
			const users = await savedUserFactory(1);
			const user = users[0];
			const port = (httpServer.address() as AddressInfo).port;
			const token = await authService.signIn(user.username, DEFAULT_PASSWORD);
			socket = io(`http://localhost:${port}`, {
				auth: {
					token: token.value
				}
			});

			await new Promise((resolve, reject) => {
				socket!.on('connect_error', () =>
					reject(new Error('Expected connect_error but connected successfully'))
				);
				socket!.on('connect', () => resolve(null));
			});
		}
	);
});
