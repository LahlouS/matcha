import type { NotificationType } from '$lib/notificationClient';
import type { ServerSocket } from './serverSocket';

export class NotificationService {
	private serverSocket: ServerSocket;

	constructor(socketServer: ServerSocket) {
		this.serverSocket = socketServer;
	}

	public sendNotification(userId: string, type: NotificationType, from: string) {
		this.serverSocket.sendMessageToUser(userId, 'notification', { type, from });
	}
}
