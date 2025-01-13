import { zod } from 'sveltekit-superforms/adapters';
import { message, superValidate } from 'sveltekit-superforms';
import { fail, redirect } from '@sveltejs/kit';
import { isWithinExpirationDate } from 'oslo';
import { lucia } from '$lib/auth';
import { error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { z } from 'zod';
import { verify } from '@node-rs/argon2';

const newPassword = z.object({
	new_password: z.string().min(4).max(31),
	confirm_password: z.string().min(4).max(255)
});

export const load: PageServerLoad = async ({ cookies, params, locals }) => {
	const user = locals.user;
	if (!user) {
		return error(500, ' reset password: something went wrong on our side');
	}
	await lucia.invalidateUserSessions(user.id);
	const verificationToken = params.token;

	const emailRepository = locals.emailRepository;
	const token = emailRepository.passwordSession(verificationToken);
	if (token) {
		await emailRepository.deleteResetPasswordSession(params.token);
	}
	if (!token) {
		console.log('--> in profile/edit-profile/reset-pswd token is invalid');
		throw error(404, 'Token is invalid');
	}

	if (!isWithinExpirationDate(new Date(token.expires_at))) {
		console.log('reset password load funciton: token is out of date');
		throw error(404, 'Token is out of date, hit forgot password again');
	}

	await locals.userRepository.updateEmailIsSetup(user.id, true);
	const session = await lucia.createSession(user.id, {});
	const sessionCookie = lucia.createSessionCookie(session.id);

	cookies.set(sessionCookie.name, sessionCookie.value, {
		path: '.',
		...sessionCookie.attributes
	});

	const form = await superValidate(zod(newPassword));
	return { form };
};

export const actions: Actions = {
	new_password: async ({ params, request, locals: { user, userRepository, emailRepository } }) => {
		const newpswd = await superValidate(request, zod(newPassword));
		if (!newpswd) {
			return fail(400, { newpswd });
		}

		if (newpswd.data.new_password !== newpswd.data.confirm_password) {
			return message(newpswd, 'new password and confirmation must be the same', {
				status: 400
			});
		}

		const userWithPswd = await userRepository.userByUsername(user.username);
		if (!userWithPswd) return fail(800, { newpswd });

		const validPassword = await verify(userWithPswd.passwordHash, newpswd.data.new_password, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});

		if (validPassword) {
			return message(newpswd, 'new password and old password must be different', {
				status: 400
			});
		}

		try {
			await userRepository.updateUserPswd(user.id, newpswd.data.new_password);
			await emailRepository.deleteResetPasswordSession(params.token);
			await emailRepository.upsertPasswordIsSet(user.id, true);
		} catch (error) {
			return message(newpswd, error, {
				status: 500
			});
		}

		redirect(302, '/');
	}
};
