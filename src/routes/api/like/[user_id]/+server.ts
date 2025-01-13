import { error } from '@sveltejs/kit';

export async function POST({ params, locals: { user: currentUser, connectionRepository } }) {
	const targetId = params.user_id;
	if (!currentUser) {
		throw error(403, 'Forbidden');
	}
	if (targetId === currentUser.id) {
		throw error(400, 'Cannot like self');
	}
	try {
		const isLiked = await connectionRepository.flipLikeUser(currentUser.id, targetId);
		return new Response(JSON.stringify({ isLiked }), { status: 200 });
	} catch (error) {
		console.error(error);
		return new Response('Error while liking user', { status: 500 });
	}
}
