import { redirect } from '@sveltejs/kit';
import { isWithinExpirationDate } from 'oslo';
import { lucia } from '$lib/auth';
import { error } from '@sveltejs/kit';

export async function GET({ params, locals }) {
	const verificationToken = params.token;

	const emailRepository = locals.emailRepository;

	const token = emailRepository.emailSession(verificationToken);
	if (token) {
		console.log('in email-verificatio api, should delete emailsession');
		await emailRepository.deleteEmailSession(token.id);
	}

	if (!token) {
		console.log('--> in api/email-verification: token is invalid');
		throw error(404, 'Token is invalid');
	}

	if (!isWithinExpirationDate(new Date(token.expires_at))) {
		redirect(302, '/sign-up/auth-email');
	}

	const user = locals.user;
	if (!user || user.email !== token.email) {
		throw error(404, 'This is not what you are looking for');
	}
	await lucia.invalidateUserSessions(user.id);
	const res = await locals.userRepository.updateEmailIsSetup(user.id, true);
	const session = await lucia.createSession(user.id, {});
	const sessionCookie = lucia.createSessionCookie(session.id);
	return new Response(null, {
		status: 302,
		headers: {
			Location: '/',
			'Set-Cookie': sessionCookie.serialize(),
			'Referrer-Policy': 'strict-origin'
		}
	});
}
