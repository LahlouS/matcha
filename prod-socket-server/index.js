import { Server } from 'socket.io';
import { l } from '../build/server/chunks/auth-mbJyYzDT.js';
import http from 'http';
import express from 'express';
import { handler } from '../build/handler.js';
import { createChat, chatsForUser, saveMessage } from './chat_repo.js';

const port = 3000;
const app = express();
const server = http.createServer(app);

// Inject SocketIO
const io = new Server(server, {
	cors: {
		origin: '*'
	}
});

let svelteKitServerSocket;
const server_id = Math.floor(Math.random() * 1000000);
let connections = new Map();
let sessionTokenToUserId = new Map();

function sendMessageToUser(id, eventName, content) {
	const connection = connections.get(id);
	if (!connection) {
		return;
	}
	const token = connection.handshake.auth.token;
	l.validateSession(token)
		.then(({ session }) => {
			if (!session) {
				connections.delete(id);
				return;
			}
			connection.emit(eventName, content);
		})
		.catch((error) => {
			console.error('Error validating session:', error);
		});
}

function setupServerSocket(socket) {
	svelteKitServerSocket = socket;
	socket.on('disconnect', () => {
		svelteKitServerSocket = null;
	});
	socket.on('redirect', ({ to, eventName, content }) => {
		sendMessageToUser(to, eventName, content);
	});
	svelteKitServerSocket.emit('connected', { id: server_id });
}

function authMiddleWare() {
	io.use(async (socket, next) => {
		const token = socket.handshake.auth.token;
		if (token === 'server') {
			return next();
		}
		if (!token) {
			return next(new Error('Authentication error'));
		}
		const { session } = await l.validateSession(token);
		if (!session) {
			return next(new Error('Authentication error'));
		}
		return next();
	});

	io.on('connection', async (socket) => {
		const token = socket.handshake.auth.token;
		if (token === 'server') {
			setupServerSocket(socket);
			return;
		}
		if (!token) {
			return;
		}
		const { session, user } = await l.validateSession(token);

		if (!session) {
			return;
		}
		connections.set(user.id, socket);
		sessionTokenToUserId.set(token, user.id);
		socket.on('disconnect', () => {
			const token = socket.handshake.auth.token;
			const userId = sessionTokenToUserId.get(token);
			if (userId) {
				connections.delete(userId);
				sessionTokenToUserId.delete(token);
			}
		});

		socket.on('fetchChats', async () => {
			const chats = await chatsForUser(user.id);
			socket.emit('fetchChatsResponse', chats);
		});
		socket.on('createChat', async ({ chatPartnerId }) => {
			const chat = await createChat(user.id, chatPartnerId);
			io.emit('newChat', chat);
		});
		socket.on('sendMessage', async ({ userId, chatId, message, to }) => {
			try {
				const createdMessage = await saveMessage(chatId, userId, message);
				sendMessageToUser(to, 'notification', { from: userId, type: 'MESSAGE' });
				io.emit('message', { chatId, message: createdMessage });
			} catch (e) {
				console.error('Error saving message:', e);
			}
		});
	});
}

authMiddleWare();

// SvelteKit handlers
app.use(handler);

server.listen(port, () => {
	console.log(`Internal Node Server up on port: ${port}`);
	console.log(`external Server up on port: 8080`);
});
