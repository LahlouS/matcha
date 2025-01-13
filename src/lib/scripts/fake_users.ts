import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import { generateIdFromEntropySize } from 'lucia';
import { faker } from '@faker-js/faker';
import { hash } from '@node-rs/argon2';
import type { User } from 'Lucia';
import type { ProfileInfo } from '../domain/profile';
import { Gender, SexualPreference } from '../domain/profile';
import { tagList } from '$lib/domain/browse';
import * as fs from 'fs';
import * as path from 'path';

// Access variables

const args = process.argv.slice(2); // Get arguments after the `node` and script name
const numUsersArg = args.find((arg) => arg.startsWith('--num='));
let numUsers = 0;
if (numUsersArg) {
	numUsers = parseInt(numUsersArg.split('=')[1], 10);
	if (isNaN(numUsers)) {
		console.error('Invalid number of users provided');
		process.exit(1);
	}
}

console.log('-----------> in fake users = ', numUsers);

function getRandomTags(tags: string[], maxTags = 5) {
	// Randomly shuffle the array using Fisher-Yates algorithm
	const shuffledTags = [...tags];
	for (let i = shuffledTags.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffledTags[i], shuffledTags[j]] = [shuffledTags[j], shuffledTags[i]];
	}

	// Return a slice of the shuffled array up to maxTags
	return shuffledTags.slice(0, faker.number.int({ min: 1, max: maxTags }));
}

function randomCoordinate(min, max) {
	return Math.random() * (max - min) + min;
}

function generateFakeCoordinates(boundingBox) {
	const { minLat, maxLat, minLon, maxLon } = boundingBox;

	return {
		latitude: randomCoordinate(minLat, maxLat),
		longitude: randomCoordinate(minLon, maxLon)
	};
}

// Example bounding box for Paris region:
const parisBoundingBox = {
	minLat: 48.8156, // Southwest corner latitude
	maxLat: 48.9022, // Northeast corner latitude
	minLon: 2.2242, // Southwest corner longitude
	maxLon: 2.4699 // Northeast corner longitude
};

async function copyFile(sourcePath: string, destinationPath: string): Promise<void> {
	try {
		// Validate that the source file exists
		if (!fs.existsSync(sourcePath)) {
			throw new Error(`Source file does not exist: ${sourcePath}`);
		}

		// Ensure the destination directory exists, create it if not
		const destinationDir = path.dirname(destinationPath);
		if (!fs.existsSync(destinationDir)) {
			fs.mkdirSync(destinationDir, { recursive: true });
		}

		// Read the file and write to the destination
		const data = await fs.promises.readFile(sourcePath);
		await fs.promises.writeFile(destinationPath, data);
	} catch (error) {
		console.error(`Error copying file: ${error.message}`);
	}
}

async function anyUser(password: string, overrides: Partial<User> = {}): Promise<User> {
	const passwordHash = await hash(password, {
		memoryCost: 19456,
		timeCost: 2,
		outputLen: 32,
		parallelism: 1
	});
	const userId = generateIdFromEntropySize(10);
	return {
		id: userId,
		email: faker.internet.email(),
		username: faker.internet.username(),
		profileIsSetup: 1,
		emailIsSetup: 1,
		passwordHash: passwordHash,
		...overrides
	} as User;
}

function anyUserProfile(overrides: Partial<ProfileInfo> = {}): ProfileInfo {
	const gender = faker.helpers.arrayElement(Object.values(Gender));

	return {
		firstName: faker.person.firstName(),
		lastName: faker.person.lastName(),
		gender: gender,
		sexualPreference: faker.helpers.arrayElement(Object.values(SexualPreference)),
		biography: faker.lorem.paragraph({ min: 1, max: 25 }),
		age: faker.number.int({ min: 18, max: 99 }),
		tags: getRandomTags(tagList, 5),
		pictures: [null, null, null, null, null],
		pictures_filenames: [],
		...overrides
	};
}

export const DATABASE_PATH = 'database/database.db';
// singleton instance
let db: DatabaseType | null = null;

function getDb(path: string = DATABASE_PATH): DatabaseType {
	if (!db) {
		db = Database(path);
	}
	return db;
}

async function createUsers(n: number) {
	if (n === 0) {
		console.log('NUMBER OF FAKE USER SET TO 0');
		return;
	}

	const db = getDb(DATABASE_PATH);

	const user_sql = db.prepare(`INSERT INTO
		users (id, email, username, profile_is_setup, email_is_setup, password_hash)
		VALUES (@id, @email, @username, @profileIsSetup, @emailIsSetup, @passwordHash)`);

	const user_profile_sql = db.prepare(`INSERT INTO
			profile_info (user_id, first_name, last_name, gender, sexual_preference, biography, age)
			VALUES (@user_id, @firstName, @lastName, @gender, @sexualPreference, @biography, @age)`);

	const user_tag_sql = db.prepare(`INSERT INTO
				tags (id, user_id, tag)
				VALUES (@id, @user_id, @tag)`);
	const user_picture_sql = db.prepare(`INSERT INTO
				profile_pictures (user_id, image_order)
				VALUES (@user_id, @order)`);
	const location_sql = db.prepare(`INSERT INTO
				location (user_id, longitude, latitude)
				VALUES (@user_id, @longitude, @latitude)`);

	const views_sql = db.prepare(
		`INSERT INTO profile_visits (visitor_id, visited_user_id) VALUES (?, ?)`
	);
	const like_sql = db.prepare(`INSERT INTO likes (liker_id, liked_id) VALUES (?, ?)`);

	let users: User[] = [];
	let user_profile: ProfileInfo[] = [];
	let user_tags: any[] = [];
	let user_picture: any[] = [];
	let location: any[] = [];

	for (let i = 0; i < n; i++) {
		users[i] = await anyUser('123456789'); // setting same password for every users so we can access there profiles easily
		user_profile[i] = anyUserProfile({ user_id: users[i].id });
		user_picture[i] = { user_id: users[i].id, order: 0 };
		let coordinates = generateFakeCoordinates(parisBoundingBox);
		location[i] = {
			user_id: users[i].id,
			longitude: coordinates.longitude,
			latitude: coordinates.latitude
		};
		if (user_profile[i].gender === 'man') {
			await copyFile(
				'static/profile_pictures/male_robot.jpg',
				'profile-pictures/' + users[i].id + '_0' + '.jpg'
			);
		} else if (user_profile[i].gender === 'woman') {
			await copyFile(
				'static/profile_pictures/female_robot.jpg',
				'profile-pictures/' + users[i].id + '_0' + '.jpg'
			);
		} else {
			await copyFile(
				'static/profile_pictures/other_robot.jpg',
				'profile-pictures/' + users[i].id + '_0' + '.jpg'
			);
		}

		for (let j = 0; j < user_profile[i].tags.length; j++) {
			let tmp = generateIdFromEntropySize(10);
			user_tags.push({ id: tmp, user_id: users[i].id, tag: user_profile[i].tags[j] });
		}
	}

	const insertManyUser = db.transaction((users: User[]) => {
		for (const u of users) user_sql.run(u);
	});
	const insertManyProfile = db.transaction((users_profle: ProfileInfo[]) => {
		for (const u of users_profle) user_profile_sql.run(u);
	});

	const insertManyLocation = db.transaction((locations: any[]) => {
		for (const l of locations) location_sql.run(l);
	});
	const insertManyTag = db.transaction((user_tags: any[]) => {
		for (const u of user_tags) user_tag_sql.run(u);
	});
	const insertManyPicture = db.transaction((user_picture: any[]) => {
		for (const u of user_picture) user_picture_sql.run(u);
	});

	insertManyUser(users);
	insertManyProfile(user_profile);
	insertManyLocation(location);
	insertManyTag(user_tags);
	insertManyPicture(user_picture);

	for (let i = 0, j = users.length - 1; i < j; i++, j--) {
		if (Math.random() < 0.5) {
			views_sql.run(users[i].id, users[j].id);
			if (Math.random() < 0.4) {
				like_sql.run(users[i].id, users[j].id);
			}
		}
		if (Math.random() < 0.5) {
			views_sql.run(users[j].id, users[i].id);
			if (Math.random() < 0.4) {
				like_sql.run(users[j].id, users[i].id);
			}
		}
	}
}

// pnpm run script:fake_users
await createUsers(numUsers);
