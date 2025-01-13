import type { Actions, PageServerLoad } from './$types';
import { isWithinExpirationDate } from 'oslo';
import { PUBLIC_BASE_URL } from '$env/static/public';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, locals: { user } }) => {
	if (!user && !url.pathname.startsWith('/sign-in')) {
		redirect(302, '/sign-in');
	} else if (user && user.emailIsSetup) {
		redirect(302, '/');
	}
};

export const actions: Actions = {
	resend: async ({ locals: { emailRepository, user } }) => {
		if (!user) {
			return fail(401, { message: 'You must be signed in to get a new link' });
		}

		const token = emailRepository.emailSessionByUserId(user.id);
		if (!token && user.emailIsSetup) {
			return fail(400, { alreadyVerified: 'Your email is already verified' });
		} else if (token && isWithinExpirationDate(new Date(token.expires_at))) {
			return fail(400, { linkStillValid: 'Your previous link is still valid' });
		}
		const verificationToken = emailRepository.createEmailVerificationToken(user.id, user.email);
		const verificationLink = `${PUBLIC_BASE_URL}/api/email-verification/` + verificationToken;
		console.log('resend verificationLink: ', verificationLink);
		await emailRepository.verificationLinkTo(user.email, verificationLink);
		return {
			success: true,
			message: 'Verification link resent successfully'
		};
	}
};
