import { describe, expect } from 'vitest';
import { type Socket as ClientSocket } from 'socket.io-client';
import { type Socket as ServerSocket } from 'socket.io';
import { itWithFixtures } from '../../fixtures';
import type { Lucia, User } from 'lucia';

function waitFor(socket: ServerSocket | ClientSocket, event: string): Promise<unknown> {
	return new Promise((resolve) => {
		socket.once(event, resolve);
	});
}

export async function waitUntilConnected(socket: ClientSocket) {
	return waitFor(socket, 'connect');
}

export async function getConnectedUser(socket: ClientSocket, lucia: Lucia): Promise<User> {
	const token = (socket.auth as { token: string }).token;
	const { user } = await lucia.validateSession(token);
	return user!;
}

describe('NotificationService', () => {
	// keep the notificationservice to keep server alive
	itWithFixtures(
		'Should be able to send notification',
		async ({ clientSocket, notificationService, notificationClient, lucia }) => {
			await waitUntilConnected(clientSocket);
			const user = await getConnectedUser(clientSocket, lucia);
			await new Promise((resolve, reject) => {
				notificationClient.subscribe((notification) => {
					try {
						expect(notification).toEqual({ type: 'LIKE', from: 'world' });
						resolve(null);
					} catch {
						reject(new Error(`Received unexpected message: ${JSON.stringify(notification)}`));
					}
				});
				notificationService.sendNotification(user.id, 'LIKE', 'world');
			});
			expect(notificationClient.notifications()).toEqual([{ type: 'LIKE', from: 'world' }]);
		}
	);

	// keep the notificationservice to keep server alive
	itWithFixtures(
		'Should not receive notifications after session is invalidated',
		async ({ clientSocket, notificationService, notificationClient, lucia }) => {
			await waitUntilConnected(clientSocket);
			const user = await getConnectedUser(clientSocket, lucia);
			const token = (clientSocket.auth as { token: string }).token;

			await lucia.invalidateSession(token);
			notificationService.sendNotification(user.id, 'LIKE', 'world');

			await new Promise((resolve) => setTimeout(resolve, 500));
			expect(notificationClient.notifications()).toEqual([]);
		}
	);
});
