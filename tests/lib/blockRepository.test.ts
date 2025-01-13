import type { ProfileWithoutPicturesAndId, UserWithPassword } from '$lib/userRepository';
import { describe, expect } from 'vitest';
import { faker } from '@faker-js/faker';
import { itWithFixtures } from '../fixtures';
import { Gender, SexualPreference, type ProfileInfo } from '$lib/domain/profile';

function anyUserProfile(overrides: Partial<ProfileInfo> = {}): ProfileWithoutPicturesAndId {
	return {
		firstName: faker.person.firstName(),
		lastName: faker.person.lastName(),
		gender: faker.helpers.arrayElement(Object.values(Gender)),
		sexualPreference: faker.helpers.arrayElement(Object.values(SexualPreference)),
		biography: faker.lorem.paragraph({ min: 1, max: 25 }),
		tags: [faker.lorem.word(), faker.lorem.word()],
		age: faker.number.int({ min: 18, max: 99 }),
		...overrides
	};
}

describe('BlockRepository', () => {
	itWithFixtures(
		'should insert a new block row',
		async ({ savedUserFactory, blockRepository, userRepository }) => {
			const users = await savedUserFactory(2, {});
			const blocker = users[0];
			const blocked = users[1];

			await blockRepository.insertBlockUser(blocker.id, blocked.id);

			const blocked_found = await blockRepository.blocker(blocker.id);
			const blocker_found = await blockRepository.blocked(blocked.id);

			expect(blocked_found.length).toBe(1);
			expect(blocker_found.length).toBe(1);
			expect(blocked_found[0]).toEqual(blocked.id);
			expect(blocker_found[0]).toEqual(blocker.id);
		}
	);

	itWithFixtures(
		'should delete views between two user',
		async ({ savedUserFactory, blockRepository, profileVisitRepository }) => {
			const users = await savedUserFactory(3, {});
			const blocker = users[0];
			const blocked = users[1];
			const other = users[2];

			await profileVisitRepository.addVisit(blocker.id, blocked.id);
			await profileVisitRepository.addVisit(blocked.id, blocker.id);
			await profileVisitRepository.addVisit(blocker.id, other.id);
			await profileVisitRepository.addVisit(other.id, blocker.id);

			await blockRepository.deleteViews(blocker.id, blocked.id);

			const blocker_found = await profileVisitRepository.profileVisitsForUser(blocker.id);
			const blocked_found = await profileVisitRepository.profileVisitsForUser(blocked.id);
			const other_found = await profileVisitRepository.profileVisitsForUser(other.id);

			expect(blocker_found.length).toBe(1);
			expect(blocked_found.length).toBe(0);
			expect(other_found.length).toBe(1);
		}
	);

	itWithFixtures(
		'should delete likes between two user',
		async ({ savedUserFactory, blockRepository, connectionRepository }) => {
			const users = await savedUserFactory(3, {});
			const blocker = users[0];
			const blocked = users[1];
			const other = users[2];

			await connectionRepository.flipLikeUser(blocker.id, blocked.id);
			await connectionRepository.flipLikeUser(blocked.id, blocker.id);
			await connectionRepository.flipLikeUser(blocker.id, other.id);
			await connectionRepository.flipLikeUser(other.id, blocker.id);

			await blockRepository.deleteLikes(blocker.id, blocked.id);

			const blocker_found = await connectionRepository.likes(blocker.id);
			const blocked_found = await connectionRepository.likes(blocked.id);
			const other_found = await connectionRepository.likes(other.id);

			expect(blocker_found.length).toBe(1);
			expect(blocked_found.length).toBe(0);
			expect(other_found.length).toBe(1);
		}
	);

	itWithFixtures(
		'should check if user share a blocking interaction',
		async ({ savedUserFactory, blockRepository }) => {
			const users = await savedUserFactory(3, {});
			const blocker = users[0];
			const blocked = users[1];
			const other = users[2];

			await blockRepository.insertBlockUser(blocker.id, blocked.id);

			const testTrue = await blockRepository.isBlockedOrBlocker(blocker.id, blocked.id);
			const testFalse = await blockRepository.isBlockedOrBlocker(other.id, blocked.id);

			expect(testTrue).toBe(true);
			expect(testFalse).toBe(false);
		}
	);
});
