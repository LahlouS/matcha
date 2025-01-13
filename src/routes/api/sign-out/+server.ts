import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { lucia } from '$lib/auth';

export const POST: RequestHandler = async ({ cookies, locals: { session } }) => {
	if (!session) {
		throw error(401, 'Unauthorized');
	}
	await lucia.invalidateSession(session.id);
	const sessionCookie = lucia.createBlankSessionCookie();
	cookies.set(sessionCookie.name, sessionCookie.value, {
		path: '/',
		...sessionCookie.attributes
	});

	return new Response(null, { status: 204 });
};
