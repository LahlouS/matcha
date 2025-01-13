import { redirect } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import type { User } from 'lucia';

export const load: LayoutServerLoad = async ({ url, locals: { user } }) => {
	if (!user && !url.pathname.startsWith('/sign-in')) {
		throw redirect(302, '/sign-in');
	}
	const currentUser = user as User;
	const id = currentUser.id;
	if (!currentUser.emailIsSetup) {
		redirect(302, `/sign-up/auth-email`);
	}
	if (
		!currentUser.passwordIsSet &&
		!url.pathname.startsWith(`/profile/${id}/edit-profile/reset-pswd`)
	) {
		throw error(
			401,
			'You must reset your password by clicking the link we sent to your email adress'
		);
	}
	if (!currentUser.profileIsSetup && !url.pathname.startsWith(`/profile/${id}/edit-profile`)) {
		redirect(302, `/profile/${id}/edit-profile`);
	}
};
