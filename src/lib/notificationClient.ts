import type { Socket } from 'socket.io-client';
import type { ToastWithoutId } from './toast/toastStore';

export type NotificationType = 'LIKE' | 'MATCH' | 'UNMATCH' | 'UNLIKE' | 'MESSAGE' | 'VISIT';
export type Notification = {
	type: string;
	from: NotificationType;
};

export function notificationToToast(notification: Notification): ToastWithoutId {
	switch (notification.type) {
		case 'LIKE':
			return { message: `User ${notification.from} liked you`, type: 'info' };
		case 'MATCH':
			return { message: `You matched with user ${notification.from}`, type: 'info' };
		case 'UNMATCH':
			return { message: `Your match with ${notification.from} is over`, type: 'info' };
		case 'UNLIKE':
			return { message: `You unliked ${notification.from}`, type: 'info' };
		case 'MESSAGE':
			return { message: `You have a new message from ${notification.from}`, type: 'info' };
		case 'VISIT':
			return { message: `This person visited your profile ${notification.from}`, type: 'info' };
		default:
			return { message: `This notification should not show`, type: 'info' };
	}
}

export class NotificationClient {
	private _notifications: Notification[] = [];
	private listeners: Map<number, (data: Notification) => void> = new Map();
	private nextListenerId: number = 1;
	private id: number;

	constructor(private client: Socket) {
		this.onNotification();
		this.onConnectionError();
		this.id = Math.random();
		console.log('creating notificationclient');
	}

	private onNotification() {
		this.client.on('notification', (arg: Notification) => {
			console.log(this.id);
			this._notifications.push(arg);
			this.listeners.forEach((listener) => listener(arg));
		});
	}

	private onConnectionError() {
		this.client.on('connect_error', (err) => {
			console.log('err.message: ', err.message);
		});
	}

	public notifications(): Notification[] {
		return this._notifications;
	}

	public subscribe(callback: (notification: Notification) => void): number {
		const id = this.nextListenerId++;
		this.listeners.set(id, callback);
		return id;
	}

	public unsubscribe(id: number) {
		this.listeners.delete(id);
	}
}
