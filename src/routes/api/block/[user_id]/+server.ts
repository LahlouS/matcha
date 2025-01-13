import { error } from '@sveltejs/kit';

export async function POST({ params, locals: { user: currentUser, blockRepository } }) {
	const targetId = params.user_id;
	if (!currentUser) {
		throw error(403, 'Forbidden');
	}
	if (targetId === currentUser.id) {
		throw error(400, 'Cannot block yourself weirdo');
	}
	try {
		await blockRepository.blockUser(currentUser.id, targetId);
		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error(error);
		return new Response('Error while blocking user', { status: 500 });
	}
}
