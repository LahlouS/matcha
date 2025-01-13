import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { user } }) => {
	if (user) {
		redirect(303, `/profile/${user.id}`);
	}
};
