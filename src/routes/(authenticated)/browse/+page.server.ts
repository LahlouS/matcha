import { redirect } from '@sveltejs/kit';
import type { BrowsingInfo } from '$lib/domain/browse';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({
	locals: { user, browsingRepository, blockRepository }
}) => {
	if (!user) {
		throw redirect(301, '/login');
	}

	try {
		// this coompute stats to make the fameScore reliable, for computational efficiency, I already made it on a big sample of user
		// const fameStats = await browsingRepository.fameStats()
		// console.log('ICICIC', fameStats)
		const userReducedProfile = await browsingRepository.browsingInfoFor(user.id);
		let ids: string[] = await browsingRepository.allOtherUsers(user.id);
		const results = await Promise.all(
			ids.map(async (id) => {
				const isBlocked = await blockRepository.isBlockedOrBlocker(id, userReducedProfile.id);
				return { id, isBlocked };
			})
		);
		// Filter the ids based on the resolved `isBlocked` values
		ids = results.filter((result) => !result.isBlocked).map((result) => result.id);

		let profiles: BrowsingInfo[] = await Promise.all(
			ids.map((idObj: string) => browsingRepository.browsingInfoFor(idObj))
		);
		profiles = await browsingRepository.preFilter(userReducedProfile.sexual_preference, profiles);
		profiles = await browsingRepository.fameRateAll(profiles);
		profiles = await browsingRepository.distanceAll(userReducedProfile, profiles);
		profiles = await browsingRepository.scoreThemAll(user.id, profiles);
		profiles = await browsingRepository.sort(profiles);
		return { profiles };
	} catch {
		// Return a fallback response for the UI or notify the user about the issue
		return {
			error: true,
			message: 'An error occurred while loading the browsing page. Please try again later.',
			profiles: [] // Return an empty array to ensure the page still renders
		};
	}
};
