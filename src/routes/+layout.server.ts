import type { User } from 'lucia';
import type { LayoutServerLoad } from './$types';
import type { UserRepository } from '$lib/userRepository';
import type { ProfileInfo } from '$lib/domain/profile';
import { error } from '@sveltejs/kit';

export const ssr = false;

async function personalInfoFor(
	user: User,
	userRepository: UserRepository
): Promise<ProfileInfo | null> {
	try {
		return await userRepository.profileInfoFor(user.id);
	} catch {
		error(500, {
			message: 'Something went wrong.'
		});
	}
}

export const load: LayoutServerLoad = async ({ locals: { user, userRepository, session } }) => {
	if (user) {
		const personalInfo = await personalInfoFor(user, userRepository);
		return { user, personalInfo, session };
	}
	return { user, personalInfo: null, session };
};
