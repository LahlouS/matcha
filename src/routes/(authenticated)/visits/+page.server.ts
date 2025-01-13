import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { user, profileVisitRepository } }) => {
	if (!user) {
		throw redirect(301, '/login');
	}
	const profileVisits = await profileVisitRepository.profileVisitsForUser(user.id);
	return {
		profileVisits
	};
};
