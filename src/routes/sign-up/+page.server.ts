import { lucia } from '$lib/auth';
import { fail, redirect } from '@sveltejs/kit';
import { generateIdFromEntropySize } from 'lucia';
import type { Actions, PageServerLoad } from './$types';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { DuplicateEntryError } from '$lib/userRepository';

const signUpSchema = z.object({
	username: z
		.string()
		.min(4, 'Username must be between 4 and 31 characters')
		.max(31, 'Username must be between 4 and 31 characters'),
	password: z
		.string()
		.min(6, 'Password must be between 6 and 255 characters')
		.max(255, 'Password must be between 6 and 255 characters'),
	email: z.string().email('Please enter a valid email address')
});

// TODO detect when user.emailIsSetup and display some kind of pop-up
export const load: PageServerLoad = async ({ locals: { user } }) => {
	if (user) {
		redirect(303, '/');
	}
	const form = await superValidate(zod(signUpSchema));
	return { form };
};

export const actions: Actions = {
	default: async ({ request, cookies, locals: { userRepository, emailRepository, user } }) => {
		if (user) {
			redirect(303, '/');
		}
		const form = await superValidate(request, zod(signUpSchema));
		if (!form.valid) {
			return fail(400, { form });
		}
		const { username, email, password } = form.data;
		const id = generateIdFromEntropySize(10);

		try {
			await userRepository.createUser({ id, username, email }, password);
			await emailRepository.emailVerification(id, email);
			const session = await lucia.createSession(id, {});
			const sessionCookie = lucia.createSessionCookie(session.id);
			cookies.set(sessionCookie.name, sessionCookie.value, {
				path: '.',
				...sessionCookie.attributes
			});
		} catch (e) {
			if (e instanceof DuplicateEntryError) {
				if (['username', 'email'].includes(e.entity)) {
					// Must be one of the two options to type hacked it to 'email' to suppress type error
					return setError(
						form,
						e.entity as 'email',
						`An account with this ${e.entity} already exists.`
					);
				} else {
					return message(form, 'Something went wrong on our side.\nPlease try again later.', {
						status: 500
					});
				}
			} else {
				return message(form, 'Something went wrong on our side.\nPlease try again later.', {
					status: 500
				});
			}
		}
		redirect(302, '/sign-up/auth-email');
	}
};
