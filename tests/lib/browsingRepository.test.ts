import { DuplicateEntryError, UserRepository } from '$lib/userRepository';
import type { ProfileWithoutPicturesAndId, UserWithPassword } from '$lib/userRepository';
import { describe, expect } from 'vitest';
import { faker } from '@faker-js/faker';
import { type User } from 'lucia';
import { verify } from '@node-rs/argon2';
import { itWithFixtures } from '../fixtures';
import { Gender, SexualPreference, type ProfileInfo } from '$lib/domain/profile';
import { anyUser } from '../testHelpers';
import { BrowsingRepository } from '$lib/browsingRepository';

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

describe('BrowsingRepository', () => {
	itWithFixtures(
		'allOtherUsers should render empty list because all profile_is_setup == false',
		async ({ browsingRepository, savedUserFactory }) => {
			const users = await savedUserFactory(5, {});
			const user = users[0];
			const others = users.slice(1);
			const found = await browsingRepository.allOtherUsers(user.id);
			expect(found.length).toBe(0);
		}
	);

	itWithFixtures(
		'allOtherUsers should render list because profile_is_setup == true',
		async ({ browsingRepository, savedUserFactory, userRepository }) => {
			const users = await savedUserFactory(5, {});
			for (const u of users) {
				await userRepository.upsertProfileIsSetup(u.id, true);
			}
			const user = users[0];
			const others = users.slice(1);
			const found = await browsingRepository.allOtherUsers(user.id);
			expect(found.length).toBe(4);
			expect(found.every((other) => other.id !== user.id)).toBe(true);
		}
	);

	itWithFixtures(
		'should get the count of user like 0 because table is empty',
		async ({ db, browsingRepository, savedUserFactory }) => {
			const users = await savedUserFactory(1, {});
			const user = users[0];
			const cnt = await browsingRepository.numberOfLiked(user.id);
			expect(cnt).toBe(0);
		}
	);

	itWithFixtures(
		'should get the count time user has been liked',
		async ({ db, browsingRepository, savedUserFactory }) => {
			const users = await savedUserFactory(5, {});
			const user = users[0];
			const others = users.slice(1);
			const sql = `INSERT INTO likes (liker_id, liked_id) VALUES (?, ?)`;
			const query = db.prepare<string, string>(sql);
			for (const oth of others) {
				const res = query.run(oth.id, user.id);
			}

			const cnt = await browsingRepository.numberOfLiked(user.id);
			expect(cnt).toBe(4);
		}
	);

	itWithFixtures(
		'should get the count of user matches',
		async ({ db, browsingRepository, savedUserFactory }) => {
			const users = await savedUserFactory(5, {});
			const user = users[0];
			const others = users.slice(1);
			const sql = `INSERT INTO likes (liker_id, liked_id) VALUES (?, ?)`;
			const query = db.prepare<string, string>(sql);
			for (const oth of others) {
				const res = query.run(oth.id, user.id); // everybody like him
				const res2 = query.run(user.id, oth.id); // he like everybody
				// == 4 match
			}

			const cnt = await browsingRepository.numberOfMatch(user.id);
			expect(cnt).toBe(4);
		}
	);

	itWithFixtures(
		'should get 0 when user has no match',
		async ({ db, browsingRepository, savedUserFactory }) => {
			const users = await savedUserFactory(5, {});
			const user = users[0];
			const others = users.slice(1);
			const sql = `INSERT INTO likes (liker_id, liked_id) VALUES (?, ?)`;
			const query = db.prepare<string, string>(sql);
			for (const oth of others) {
				const res2 = query.run(user.id, oth.id); // he like everybody
			}

			const cnt = await browsingRepository.numberOfMatch(user.id);
			expect(cnt).toBe(0);
		}
	);

	itWithFixtures(
		'should get the count time user has been visited',
		async ({ db, browsingRepository, savedUserFactory }) => {
			const users = await savedUserFactory(5, {});
			const user = users[0];
			const others = users.slice(1);
			const sql = `INSERT INTO profile_visits (visitor_id, visited_user_id) VALUES (?, ?)`;
			const query = db.prepare<string, string>(sql);
			for (const oth of others) {
				const res = query.run(oth.id, user.id); // everyone visited user
			}

			const cnt = await browsingRepository.numberOfVisited(user.id);
			expect(cnt).toBe(4);
		}
	);

	itWithFixtures(
		'should get the count of user visit 0 because table is empty',
		async ({ browsingRepository, savedUserFactory }) => {
			const users = await savedUserFactory(1, {});
			const user = users[0];
			const cnt = await browsingRepository.numberOfVisited(user.id);
			expect(cnt).toBe(0);
		}
	);

	itWithFixtures(
		'fameRating for each user is 0 because like and views table are empty',
		async ({ browsingRepository, savedUserFactory }) => {
			const users = await savedUserFactory(5, {});

			const fameRates: number[] = [];
			for (const u of users) {
				fameRates.push(await browsingRepository.fameRatingFor(u.id));
			}
			const result = [0, 0, 0, 0, 0]; // Your function output here
			expect(fameRates).toEqual(result);
		}
	);

	itWithFixtures(
		'user has fameRating because everyone viewed him',
		async ({ db, browsingRepository, savedUserFactory }) => {
			const users = await savedUserFactory(6, {});
			const user = users[0];
			const others = users.slice(1);
			const sql = `INSERT INTO profile_visits (visitor_id, visited_user_id) VALUES (?, ?)`;
			const query = db.prepare<string, string>(sql);
			for (const oth of others) {
				const res = query.run(oth.id, user.id); // everyone visited user
			}
			const rating = await browsingRepository.fameRatingFor(user.id);
			const test = rating > 0 ? true : false;
			expect(test).toBe(true);
		}
	);

	itWithFixtures(
		'fame rating increase if user get likes',
		async ({ db, browsingRepository, savedUserFactory }) => {
			const users = await savedUserFactory(7, {});
			const user = users[0];
			const user2 = users[1];
			const others = users.slice(2);
			const sql_likes = `INSERT INTO likes (liker_id, liked_id) VALUES (?, ?)`;
			const sql_views = `INSERT INTO profile_visits (visitor_id, visited_user_id) VALUES (?, ?)`;
			const querylikes = db.prepare<string, string>(sql_likes);
			const queryviews = db.prepare<string, string>(sql_views);

			for (const oth of others) {
				queryviews.run(oth.id, user.id); // everyone visited user
				queryviews.run(oth.id, user2.id); // everyone visited user2
				querylikes.run(oth.id, user2.id); // everyone liked user2
			}

			const rating = await browsingRepository.fameRatingFor(user.id);
			const rating2 = await browsingRepository.fameRatingFor(user2.id);
			expect(rating2).toBeGreaterThan(rating);
		}
	);

	itWithFixtures(
		'compute fame rating for a list of user',
		async ({ db, browsingRepository, savedUserFactory }) => {
			const users = await savedUserFactory(7, {});
			const user = users[0];
			const user2 = users[1];
			const others = users.slice(2);
			const sql_likes = `INSERT INTO likes (liker_id, liked_id) VALUES (?, ?)`;
			const sql_views = `INSERT INTO profile_visits (visitor_id, visited_user_id) VALUES (?, ?)`;
			const querylikes = db.prepare<string, string>(sql_likes);
			const queryviews = db.prepare<string, string>(sql_views);

			let last = users.length - 1;
			for (const oth of others) {
				queryviews.run(oth.id, user.id); // everyone visited user
				queryviews.run(oth.id, user2.id); // everyone visited user2
				querylikes.run(oth.id, user2.id); // everyone liked user2
				if (oth.id !== users[last].id) querylikes.run(oth.id, users[last].id);
			}
			let tmp = [];
			for (const u of users) {
				tmp.push({ id: u.id, fameRate: 0 });
			}
			const rates = await browsingRepository.fameRateAll(tmp);
			const test = rates.map((rate) => (rate.fameRate !== 0 ? true : false));
			const truth = [true, true, false, false, false, false, true];

			expect(test).toEqual(truth);
		}
	);

	itWithFixtures(
		'compute common tag',
		async ({ db, browsingRepository, savedUserFactory, userRepository }) => {
			const users = await savedUserFactory(2, {});
			const user = users[0];
			const userProfile = anyUserProfile({ tags: ['food', 'cine', 'sport'] });
			const user2 = users[1];
			const userProfile2 = anyUserProfile({ tags: ['food', 'cine', 'sport'] });

			await userRepository.upsertProfileInfo(user.id, userProfile);
			await userRepository.upsertProfileInfo(user2.id, userProfile2);

			const cnt = await browsingRepository.commonTagsStats(user.id, user2.id);
			expect(cnt.commonTag).toEqual(3);
			expect(cnt.ntagsUser1).toEqual(3);
			expect(cnt.ntagsUser2).toEqual(3);
		}
	);

	itWithFixtures(
		'common tag is 0 because user2 has different tags',
		async ({ db, browsingRepository, savedUserFactory, userRepository }) => {
			const users = await savedUserFactory(2, {});
			const user = users[0];
			const userProfile = anyUserProfile({ tags: ['food', 'cine', 'sport'] });
			const user2 = users[1];
			const userProfile2 = anyUserProfile({ tags: [] });

			await userRepository.upsertProfileInfo(user.id, userProfile);
			await userRepository.upsertProfileInfo(user2.id, userProfile2);

			const cnt = await browsingRepository.commonTagsStats(user.id, user2.id);
			expect(cnt.commonTag).toEqual(0);
			expect(cnt.ntagsUser1).toEqual(3);
			expect(cnt.ntagsUser2).toEqual(0);
		}
	);

	itWithFixtures(
		'common tag is 2 because user2 has different tags',
		async ({ db, browsingRepository, savedUserFactory, userRepository }) => {
			const users = await savedUserFactory(2, {});
			const user = users[0];
			const userProfile = anyUserProfile({ tags: ['food', 'cine', 'sport'] });
			const user2 = users[1];
			const userProfile2 = anyUserProfile({ tags: ['zeub', 'food', 'sport'] });

			await userRepository.upsertProfileInfo(user.id, userProfile);
			await userRepository.upsertProfileInfo(user2.id, userProfile2);

			const cnt = await browsingRepository.commonTagsStats(user.id, user2.id);
			expect(cnt.commonTag).toEqual(2);
			expect(cnt.ntagsUser1).toEqual(3);
			expect(cnt.ntagsUser2).toEqual(3);
		}
	);

	itWithFixtures(
		'scoring user2 with respect to user1',
		async ({ db, browsingRepository, savedUserFactory, userRepository }) => {
			const users = await savedUserFactory(10, {});
			const user = users[0];
			const userProfile = anyUserProfile({ tags: ['food', 'cine', 'sport'] });
			const user2 = users[1];
			const userProfile2 = anyUserProfile({ tags: ['zeub', 'food', 'sport'] });

			await userRepository.upsertProfileInfo(user.id, userProfile);
			await userRepository.upsertProfileInfo(user2.id, userProfile2);

			const others = users.slice(2);
			const sql_likes = `INSERT INTO likes (liker_id, liked_id) VALUES (?, ?)`;
			const sql_views = `INSERT INTO profile_visits (visitor_id, visited_user_id) VALUES (?, ?)`;
			const querylikes = db.prepare<string, string>(sql_likes);
			const queryviews = db.prepare<string, string>(sql_views);

			for (const o of others) {
				queryviews.run(o.id, user.id); // everyone visited user
				queryviews.run(o.id, user2.id); // everyone visited user2
				querylikes.run(o.id, user2.id); // everyone liked user2
			}

			const distance = 25;
			const distance2 = 25;
			const score = await browsingRepository.scoring(user.id, user2.id, distance);
			const score2 = await browsingRepository.scoring(user2.id, user.id, distance2);

			console.log('---- > score1 score2', score, score2);

			const test = score > 0 ? true : false;
			expect(test).toBe(true);
			expect(score).toBeGreaterThan(score2);
		}
	);
});
