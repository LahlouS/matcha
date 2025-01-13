import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { lucia } from '$lib/auth';
import { AuthServiceError } from '$lib/server/authService';

const signInSchema = z.object({
	username: z.string().min(4).max(31),
	password: z.string().min(6).max(255)
});

const emailSchema = z.object({
	username: z.string().min(4).max(31),
	email: z.string().email({ message: 'Invalid email address' })
});

export const load: PageServerLoad = async ({ locals: { user } }) => {
	if (user) {
		redirect(303, '/');
	}
	const form = await superValidate(zod(signInSchema));
	return { form };
};

export const actions: Actions = {
	sign_in: async ({ request, cookies, locals: { authService } }) => {
		const form = await superValidate(request, zod(signInSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		const { username, password } = form.data;

		try {
			const sessionCookie = await authService.signIn(username, password);
			cookies.set(sessionCookie.name, sessionCookie.value, {
				path: '.',
				...sessionCookie.attributes
			});
		} catch (e) {
			if (!(e instanceof AuthServiceError)) {
				return message(form, 'Something went wrong logging you in. Try again later.', {
					status: 500
				});
			}
			if (e.type === 'INCORRECT_USERNAME_OR_PASSWORD') {
				return message(form, 'Incorrect username or password', {
					status: 400
				});
			} else {
				return message(form, 'Something went wrong logging you in. Try again later.', {
					status: 500
				});
			}
		}
		return redirect(302, '/');
	},
	forgot_pswd: async ({ request, cookies, locals: { userRepository, emailRepository } }) => {
		const form = await superValidate(request, zod(emailSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		const { username, email } = form.data;
		const user = await userRepository.userByUsername(username);
		if (!user || email !== user.email) {
			return message(form, 'Incorrect username or email', {
				status: 400
			});
		}
		if (!user.emailIsSetup) {
			return message(
				form,
				'your email has not been verified, you must contact service support at matchalover.serviceteam@gmail.com to unlock your profile',
				{ status: 400 }
			);
		}
		try {
			await emailRepository.passwordVerification(user.id, email, user.passwordHash);
			const session = await lucia.createSession(user.id, {});
			const sessionCookie = lucia.createSessionCookie(session.id);
			cookies.set(sessionCookie.name, sessionCookie.value, {
				path: '.',
				...sessionCookie.attributes
			});
			return message(
				form,
				'Email verified, we sent you a verification link to reset your password',
				{ status: 418 }
			);
		} catch (error) {
			console.log('ERROR IN THE FORGOT PASSWORD ACTION: ', error);
			return message(form, 'Something went wrong on our side.\nPlease try again later.', {
				status: 500
			});
		}
	}
};
