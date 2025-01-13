import { getDb } from '$lib/database/database';
import { UserRepository } from '$lib/userRepository';
import { ImageRepository } from '$lib/imageRepository';
import { EmailRepository, getTransporter } from '$lib/emailRepository';
import { type Handle } from '@sveltejs/kit';
import { lucia } from '$lib/auth';
import { IMAGE_FOLDER } from '$env/static/private';
import { ProfileVisitRepository } from '$lib/profileVisitRepository';
import { BrowsingRepository } from '$lib/browsingRepository';
import { ConnectionRepository } from '$lib/server/connectionRepository';
import { AuthService } from '$lib/server/authService';
import { NotificationService } from '$lib/server/notificationService';
import { sequence } from '@sveltejs/kit/hooks';
import { getServerSocket } from '$lib/server/serverSocket';
import { BlockRepository } from '$lib/blockRepository';
import { ChatRepository } from '$lib/server/chatRepository';

const authHandle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get(lucia.sessionCookieName);
	if (!sessionId) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = await lucia.validateSession(sessionId);
	if (session !== null) {
		const sessionCookie = lucia.createSessionCookie(session!.id);
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});
	} else {
		const sessionCookie = lucia.createBlankSessionCookie();
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});
	}
	event.locals.session = session;
	event.locals.user = user;
	return resolve(event);
};

export const dependencyHandle: Handle = async ({ event, resolve }) => {
	const db = getDb();
	const transporter = getTransporter();
	// const socket = getServerSocket(event.url.origin);
	const socket = getServerSocket('http://localhost:3000');
	const imageRepo = new ImageRepository(IMAGE_FOLDER, db);
	const notificationService = new NotificationService(socket);
	event.locals.userRepository = new UserRepository(db, imageRepo);
	event.locals.emailRepository = new EmailRepository(db, transporter);
	event.locals.profileVisitRepository = new ProfileVisitRepository(db, notificationService);
	event.locals.browsingRepository = new BrowsingRepository(db);
	const chatRepository = new ChatRepository(db);
	event.locals.chatRepository = chatRepository;

	event.locals.connectionRepository = new ConnectionRepository(
		db,
		notificationService,
		socket,
		chatRepository
	);
	event.locals.blockRepository = new BlockRepository(db, event.locals.connectionRepository);
	// event.locals.blockRepository = new BlockRepository(db);
	event.locals.authService = new AuthService(event.locals.userRepository, lucia);
	return resolve(event);
};

export const handle = sequence(authHandle, dependencyHandle);
