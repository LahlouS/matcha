import { describe } from 'vitest';
import { itWithFixtures } from '../fixtures';

describe('ProfileVisitRepository', () => {
	itWithFixtures(
		'should be able to add a visit',
		async ({ profileVisitRepository, savedUserFactory, expect }) => {
			const users = await savedUserFactory(2, {});

			await profileVisitRepository.addVisit(users[0].id, users[1].id);

			const visits = await profileVisitRepository.profileVisitsForUser(users[1].id);

			const visitorIds = visits.map((visit) => visit.visitorId);
			expect(visitorIds).toEqual([users[0].id]);
		}
	);

	itWithFixtures(
		'Adding page visit a second time should not error',
		async ({ profileVisitRepository, savedUserFactory }) => {
			const users = await savedUserFactory(2, {});

			await profileVisitRepository.addVisit(users[0].id, users[1].id);
			await profileVisitRepository.addVisit(users[0].id, users[1].id);
		}
	);
});
