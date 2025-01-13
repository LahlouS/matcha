import { DuplicateEntryError } from '$lib/userRepository';
import type { ProfileWithoutPicturesAndId, UserWithPassword } from '$lib/userRepository';
import { describe, expect } from 'vitest';
import { faker } from '@faker-js/faker';
import { type User } from 'lucia';
import { verify } from '@node-rs/argon2';
import { itWithFixtures } from '../fixtures';
import { Gender, SexualPreference, type ProfileInfo } from '$lib/domain/profile';
import { anyUser } from '../testHelpers';

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

describe('UserRepository', () => {
	itWithFixtures('should be able to create a new user', async ({ userRepository }) => {
		const password = faker.internet.password();
		const user = anyUser({ profileIsSetup: false });

		const response = await userRepository.createUser(user, password);
		const found = await userRepository.user(response.id);

		expect(found).toMatchObject(user);
	});

	itWithFixtures('should be able to set user profile', async ({ userRepository, savedUser }) => {
		const userProfile = anyUserProfile();

		await userRepository.upsertProfileInfo(savedUser.id, userProfile);

		const found = await userRepository.profileInfoFor(savedUser.id);

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { userId, ...rest } = found!;
		expect(rest).toEqual(userProfile);
	});

	itWithFixtures('should be able to update user profile', async ({ userRepository }) => {
		const userProfile = anyUserProfile();
		const user = anyUser({ profileIsSetup: true });
		await userRepository.createUser(user, faker.internet.password());
		await userRepository.upsertProfileInfo(user.id, userProfile);

		userProfile.biography = 'I am a new person';
		await userRepository.upsertProfileInfo(user.id, userProfile);

		const found = await userRepository.profileInfoFor(user.id);

		// ignoring the image properties that are tested in the imageRepository
		expect(found).toEqual(
			expect.objectContaining({
				firstName: userProfile.firstName,
				lastName: userProfile.lastName,
				gender: userProfile.gender,
				sexualPreference: userProfile.sexualPreference,
				biography: userProfile.biography,
				tags: userProfile.tags
			})
		);
	});

	itWithFixtures('Setting new tags does not double tags', async ({ userRepository }) => {
		const userProfile = anyUserProfile();
		const user = anyUser({ profileIsSetup: true });
		await userRepository.createUser(user, faker.internet.password());

		userProfile.tags = ['tag1000'];
		await userRepository.upsertProfileInfo(user.id, userProfile);

		const found = await userRepository.profileInfoFor(user.id);
		// ignoring the image properties that are tested in the imageRepository
		expect(found).toEqual(
			expect.objectContaining({
				firstName: userProfile.firstName,
				lastName: userProfile.lastName,
				gender: userProfile.gender,
				sexualPreference: userProfile.sexualPreference,
				biography: userProfile.biography,
				tags: userProfile.tags
			})
		);
	});

	itWithFixtures(
		'Setting user profile dont set profile_is_setup true because profile image is not set',
		async ({ userRepository }) => {
			const user = anyUser({ profileIsSetup: false });
			await userRepository.createUser(user, faker.internet.password());

			let found = (await userRepository.user(user.id)) as User;
			expect(found.profileIsSetup).toBe(false);

			const userProfile = anyUserProfile();
			await userRepository.upsertProfileInfo(user.id, userProfile);

			found = (await userRepository.user(user.id)) as User;
			expect(found.profileIsSetup).toBe(false);
		}
	);

	itWithFixtures(
		'Setting user profile sets profile_is_setup true because profile image is set',
		async ({ userRepository, image }) => {
			const user = anyUser({ profileIsSetup: false });
			await userRepository.createUser(user, faker.internet.password());

			let found = (await userRepository.user(user.id)) as User;
			expect(found.profileIsSetup).toBe(false);

			const userProfile = anyUserProfile();
			await userRepository.saveUserImage(user.id, 0, image);
			await userRepository.upsertProfileInfo(user.id, userProfile);

			found = (await userRepository.user(user.id)) as User;
			expect(found.profileIsSetup).toBe(true);
		}
	);

	itWithFixtures(
		'Can get all other user profiles where profile_is_setup == true',
		async ({ userRepository, savedUserFactory, image }) => {
			const profile = anyUserProfile();
			const users = await savedUserFactory(3);
			const thisUser = users[0];
			const others = users.slice(1);
			for (const user of users) {
				await userRepository.saveUserImage(user.id, 0, image);
			}

			for (const user of users) {
				await userRepository.upsertProfileInfo(user.id, profile);
			}

			const found = await userRepository.allOtherUsers(thisUser.id);
			expect(found).toHaveLength(others.length);
			expect(found).toEqual(expect.arrayContaining(others.map((user) => user.id)));
		}
	);

	itWithFixtures.only(
		'Cannot get others users profiles because we dont set the pictures',
		async ({ userRepository, savedUserFactory }) => {
			const profile = anyUserProfile();
			const users = await savedUserFactory(3);
			const thisUser = users[0];

			for (const user of users) {
				await userRepository.upsertProfileInfo(user.id, profile);
			}

			const found = await userRepository.allOtherUsers(thisUser.id);
			expect(found).toHaveLength(0);
		}
	);

	itWithFixtures('Can get profile previews', async ({ userRepository, savedUserFactory }) => {
		const profile = anyUserProfile();
		const users = await savedUserFactory(3, {});
		for (const user of users) {
			await userRepository.upsertProfileInfo(user.id, profile);
		}

		const preview = await userRepository.profilePreviews(users.map((user) => user.id));

		const expected = users.map((user) => {
			return {
				userId: user.id,
				firstName: profile.firstName,
				lastName: profile.lastName
			};
		});
		expect(preview).toStrictEqual(expected);
	});

	itWithFixtures('Should be able to fetch user by username', async ({ userRepository }) => {
		const password = faker.internet.password();
		const user = anyUser({ profileIsSetup: false });
		await userRepository.createUser(user, password);

		const found = await userRepository.userByUsername(user.username);

		expect(found).toMatchObject(user);
	});

	itWithFixtures('should return null if user does not exist', async ({ userRepository }) => {
		const response = await userRepository.user(faker.string.uuid());

		expect(response).toBeNull();
	});

	itWithFixtures(
		'should return DuplicateEntryError if username taken',
		async ({ userRepository }) => {
			const userName = faker.internet.username();
			const password = faker.internet.password();
			const userOne = anyUser({ username: userName, profileIsSetup: false });
			const userTwo = anyUser({ username: userName, profileIsSetup: false });
			await userRepository.createUser(userOne, password);

			try {
				await userRepository.createUser(userTwo, password);
			} catch (e) {
				expect(e).toBeInstanceOf(DuplicateEntryError);
				expect((e as DuplicateEntryError).entity).toBe('username');
			}
		}
	);

	itWithFixtures('should be able to update user email', async ({ userRepository }) => {
		const user = anyUser({ profileIsSetup: true });
		const new_email = faker.internet.email();
		await userRepository.createUser(user, faker.internet.password());

		await userRepository.updateUserEmail(user.id, new_email);
		const found = (await userRepository.user(user.id)) as User;
		expect(found.email).toEqual(new_email);
	});

	itWithFixtures('should be able update email_is_setup flag', async ({ userRepository }) => {
		const user = anyUser({ emailIsSetup: false });

		await userRepository.createUser(user, faker.internet.password());

		await userRepository.updateEmailIsSetup(user.id, true);

		const found = await userRepository.user(user.id);
		expect(found?.emailIsSetup).toBe(true);
	});

	itWithFixtures('should be able to update user password', async ({ userRepository }) => {
		const user = anyUser({ profileIsSetup: true });

		const oldpswd = faker.internet.password();
		await userRepository.createUser(user, oldpswd);

		const newpswd = faker.internet.password();

		await userRepository.updateUserPswd(user.id, newpswd);
		const found = (await userRepository.userByUsername(user.username)) as UserWithPassword;
		const validPassword = await verify(found.passwordHash, newpswd, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});

		expect(validPassword).toBeTruthy();
	});

	itWithFixtures(
		'should return false because image profile is not set',
		async ({ userRepository }) => {
			const user = anyUser({ profileIsSetup: true });

			const oldpswd = faker.internet.password();
			await userRepository.createUser(user, oldpswd);

			const res = await userRepository.profileImageIsSet(user.id);

			expect(res).toBe(false);
		}
	);

	itWithFixtures(
		'should return false profileInfo is not full / set',
		async ({ userRepository }) => {
			const user = anyUser({ profileIsSetup: true });
			const oldpswd = faker.internet.password();
			await userRepository.createUser(user, oldpswd);
			const res = await userRepository.profileInfoIsSet(user.id);
			expect(res).toBe(false);
		}
	);

	itWithFixtures('should return true profileInfo is fullfilled', async ({ userRepository }) => {
		const user = anyUser({ profileIsSetup: true });
		const profile = anyUserProfile();
		const oldpswd = faker.internet.password();
		await userRepository.createUser(user, oldpswd);
		await userRepository.upsertProfileInfo(user.id, profile);
		const res = await userRepository.profileInfoIsSet(user.id);
		expect(res).toBe(true);
	});

	itWithFixtures(
		'setting profile before image profile should also set profileIsSetup to true if Profile info is complete',
		async ({ userRepository, image }) => {
			const user = anyUser({ profileIsSetup: false });
			await userRepository.createUser(user, faker.internet.password());

			let found = (await userRepository.user(user.id)) as User;
			expect(found.profileIsSetup).toBe(false);

			const userProfile = anyUserProfile();
			await userRepository.upsertProfileInfo(user.id, userProfile);
			await userRepository.saveUserImage(user.id, 0, image);

			found = (await userRepository.user(user.id)) as User;
			expect(found.profileIsSetup).toBe(true);
		}
	);

	itWithFixtures(
		'upsert coordinate for user that has empty profile',
		async ({ userRepository }) => {
			const user = anyUser({ profileIsSetup: false });
			const latitude = faker.address.latitude();
			const longitude = faker.address.longitude();

			await userRepository.createUser(user, faker.internet.password());
			await userRepository.upsertLocation(user.id, longitude, latitude);
			const res = await userRepository.location(user.id);
			expect(res.longitude).toEqual(longitude);
			expect(res.latitude).toEqual(latitude);
		}
	);

	itWithFixtures(
		'upsert coordinate for user even if user profile already exist',
		async ({ userRepository }) => {
			const user = anyUser({ profileIsSetup: false });
			await userRepository.createUser(user, faker.internet.password());
			const userProfile = anyUserProfile();
			await userRepository.upsertProfileInfo(user.id, userProfile);

			const latitude = faker.address.latitude();
			const longitude = faker.address.longitude();

			await userRepository.upsertLocation(user.id, longitude, latitude);
			const res = await userRepository.location(user.id);
			expect(res.longitude).toEqual(longitude);
			expect(res.latitude).toEqual(latitude);
		}
	);
});
