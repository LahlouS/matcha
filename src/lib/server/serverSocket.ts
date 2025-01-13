import type { JsonSerializable } from '$lib/types/jsonSerializable';
import { io, type Socket } from 'socket.io-client';

let _instance: ServerSocket | null = null;

export class ServerSocket {
	private socket: Socket;

	constructor(url: string) {
		this.socket = io(url, {
			auth: {
				token: 'server'
			}
		});
	}

	public sendMessageToUser(toUserId: string, eventName: string, content: JsonSerializable) {
		this.socket.emit('redirect', { to: toUserId, eventName, content });
	}
}

export function getServerSocket(url: string): ServerSocket {
	if (!_instance) {
		_instance = new ServerSocket(url);
	}
	return _instance!;
}
