import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({
	locals: { user, connectionRepository, chatRepository },
	params: { id }
}) => {
	if (!user) {
		throw redirect(301, '/login');
	}

	const status = await connectionRepository.matchStatus(user.id, id);
	if (!status || status.status !== 'MATCHED') {
		throw redirect(301, '/chat');
	}

	const allChats = await chatRepository.chatsForUser(user.id);
	const chat = allChats.find((c) => c.userOne === id || c.userTwo === id);

	if (!chat) {
		throw error(500);
	}

	return {
		user,
		chat
	};
};
