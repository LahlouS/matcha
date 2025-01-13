import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { isGender, isSexualPreference } from '$lib/domain/profile';
import { tagList } from '$lib/domain/browse';

const profileSchema = z.object({
	firstName: z.string().min(1).max(255),
	lastName: z.string().min(1).max(255),
	gender: z.enum(['man', 'woman', 'other']).refine((value) => isGender(value)),
	sexualPreference: z
		.enum(['men', 'women', 'all', 'other'])
		.refine((value) => isSexualPreference(value)),
	biography: z.string().min(0).max(500).default(''),
	age: z
		.number()
		.min(18, { message: 'Age must be at least 18' })
		.max(99, { message: 'bro you too old for this shit' }),
	tags: z
		.string()
		.array()
		.min(2, { message: 'you must choose at least 2 tag' })
		.max(5, { message: 'you cannot choose more than 5 tag' })
});

export const load: PageServerLoad = async ({ locals: { user, userRepository }, params }) => {
	const id = params.user_id;
	if (!user || user.id !== id) {
		throw fail(401, { message: 'You must be signed in to update your profile' });
	}
	const currentProfile = await userRepository.profileInfoFor(user.id);
	const form = await superValidate(
		currentProfile ? { ...currentProfile, tags: currentProfile.tags } : { age: 18 },
		zod(profileSchema)
	);
	return { form, user, tagList };
};

export const actions: Actions = {
	default: async ({ request, locals: { userRepository, user }, params }) => {
		const id = params.user_id;
		if (!user || user.id !== id) {
			return fail(401, { message: 'You must be signed in to update your profile' });
		}
		const form = await superValidate(request, zod(profileSchema));
		const imageIsSet = await userRepository.profileImageIsSet(user.id);
		if (!form.valid) {
			return message(form, 'Please fix the invalid fields before trying again.', { status: 400 });
		} else if (!imageIsSet) {
			return message(form, 'You need a profile picture for you profile to be complete', {
				status: 400
			});
		}

		const formData = form.data;
		try {
			await userRepository.upsertProfileInfo(user.id, formData);
		} catch {
			return message(form, 'An error occurred while updating your profile', { status: 500 });
		}

		return message(form, 'Profile updated!');
	}
};
