import { zod } from 'sveltekit-superforms/adapters';
import { message, superValidate } from 'sveltekit-superforms';
import { fail, redirect, type Action } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { z } from 'zod';
import { UserRepositoryError } from '$lib/userRepository';

const newEmail = z.object({
	new_email: z.string().email({ message: 'Invalid email address' }),
	confirm_email: z.string().email({ message: 'Invalid email address' })
});

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		return error(500, 'update e-mail: something went wrong on our side');
	}

	const form = await superValidate(zod(newEmail));
	return { form };
};

export const actions: Actions = {
	new_email: async ({ request, locals: { user, userRepository, emailRepository } }) => {
		const newemail = await superValidate(request, zod(newEmail));

		if (!newemail) {
			return fail(400, { newemail });
		}

		if (newemail.data.new_email !== newemail.data.confirm_email) {
			return message(newemail, 'new email and confirmation must be the same', {
				status: 400
			});
		}

		if (newemail.data.new_email == user!.email) {
			return message(newemail, 'new email must be different from the previous one', {
				status: 400
			});
		}

		try {
			await userRepository.updateUserEmail(user.id, newemail.data.new_email);
			await emailRepository.emailVerification(user.id, newemail.data.new_email);
		} catch (error) {
			return message(newemail, 'Something went wrong updating your email', {
				status: 500
			});
		}

		redirect(302, '/sign-up/auth-email');
	}
};
