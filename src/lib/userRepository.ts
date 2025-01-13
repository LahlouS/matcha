import type { Database } from 'better-sqlite3';
import { SqliteError } from 'better-sqlite3';
import type { ProfileInfo } from './domain/profile';
import { hash } from '@node-rs/argon2';
import _ from 'lodash';
import type { User } from 'lucia';
import { v4 as uuidv4 } from 'uuid';
import { ImageRepository } from './imageRepository';
import { Buffer } from 'buffer';
import type { ToSnakeCase } from './types/snakeCase';

type UserWithPassword = User & { passwordHash: string };

type UserWithoutProfileSetup = Omit<User, 'profileIsSetup' | 'emailIsSetup' | 'passwordIsSet'>;

type ProfileWithoutPicturesAndId = Omit<ProfileInfo, 'uploadedPictures' | 'userId'>;

type ProfilePreview = {
	userId: string;
	firstName: string;
	lastName: string;
};

class UserRepositoryError extends Error {
	exception: unknown;
	constructor(message: string, exception: unknown) {
		super(message);
		this.name = 'UserRepositoryError';
		this.exception = exception;
	}
}

class DuplicateEntryError extends UserRepositoryError {
	entity: string;

	constructor(message: string, entity: string) {
		super(message, null);
		this.name = 'DuplicateEntryError';
		this.entity = entity;
	}
}

class UserRepository {
	constructor(
		private db: Database,
		private imageRepo: ImageRepository
	) {}

	async userByUsername(username: string): Promise<UserWithPassword | null> {
		return new Promise((resolve, reject) => {
			try {
				const result = this.db
					.prepare<
						string,
						ToSnakeCase<UserWithPassword>
					>('SELECT id, email, username, password_hash, profile_is_setup, email_is_setup FROM users WHERE username = ?')
					.get(username);
				if (result) {
					const camelCaseObject = _.mapKeys(result, (value, key) => _.camelCase(key)) as any;
					camelCaseObject.profileIsSetup = camelCaseObject.profileIsSetup === 0 ? false : true;
					resolve(camelCaseObject as UserWithPassword);
				} else {
					resolve(null);
				}
			} catch (e) {
				reject(
					new UserRepositoryError('Something went wrong fetching user for username: ' + username, e)
				);
			}
		});
	}

	async userProfile(id: string): Promise<ProfileInfo | null> {
		return new Promise((resolve, reject) => {
			try {
				const result = this.db
					.prepare<string, ProfileInfo>(
						`
						SELECT
							profiles.user_id,
							profiles.gender,
							profiles.sex_preference,
							profiles.biography,
							GROUP_CONCAT(DISTINCT pictures.url) AS pictures,
							GROUP_CONCAT(DISTINCT tags.tag) AS tags
						FROM
							profiles
						INNER JOIN
							pictures ON profiles.user_id = pictures.user_id
						INNER JOIN
							tags ON profiles.user_id = tags.user_id
						WHERE
							profiles.user_id = ?
						GROUP BY
							profiles.user_id;
					`
					)
					.get(id);
				resolve(result ? result : null);
			} catch (e) {
				reject(
					new UserRepositoryError('Something went wrong fetching user profile for id: ' + id, e)
				);
			}
		});
	}

	async profilePreviews(ids: string[]): Promise<ProfilePreview[]> {
		const getProfilePreview = this.db.prepare<string, ToSnakeCase<ProfilePreview>>(
			`SELECT user_id, first_name, last_name
			FROM profile_info
			WHERE user_id = ?`
		);
		return new Promise((resolve, reject) => {
			try {
				const transaction = this.db.transaction((ids: string[]) => {
					return ids.map((id) => getProfilePreview.get(id)).filter((result) => result != null);
				});
				const result = transaction(ids);
				const mapped = result.map((res) => {
					const camelCaseObject = _.mapKeys(res, (value, key) => _.camelCase(key));
					return camelCaseObject as ProfilePreview;
				});
				resolve(mapped);
			} catch (e) {
				reject(new UserRepositoryError('Something went wrong fetching profile previews', e));
			}
		});
	}

	async profileInfoFor(id: string): Promise<ProfileInfo | null> {
		return new Promise((resolve, reject) => {
			try {
				const result = this.db
					.prepare<string, ToSnakeCase<ProfileInfo>>(
						`
						SELECT profile_info.*, GROUP_CONCAT(tags.tag) AS tags
						FROM profile_info
						LEFT JOIN tags ON profile_info.user_id = tags.user_id
						WHERE profile_info.user_id = ?
						GROUP BY profile_info.user_id
						`
					)
					.get(id);
				if (!result) {
					resolve(null);
				} else {
					const camelCaseObject = _.mapKeys(result, (value, key) => _.camelCase(key));
					if (camelCaseObject.tags) {
						camelCaseObject.tags = (camelCaseObject.tags as string).split(',');
					} else {
						camelCaseObject.tags = [];
					}
					resolve(camelCaseObject as ProfileInfo);
				}
			} catch (e) {
				reject(
					new UserRepositoryError('Something went wrong fetching user for username: ' + id, e)
				);
			}
		});
	}

	async upsertProfileInfo(
		id: string,
		info: ProfileWithoutPicturesAndId
	): Promise<Array<string | null>> {
		const insertIntoProfile = this.db.prepare<
			[string, string, string, string, string, string, number]
		>(`
				INSERT INTO profile_info (user_id, first_name, last_name, gender, sexual_preference, biography, age)
				VALUES (?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(user_id) DO UPDATE SET
				first_name=excluded.first_name,
				last_name=excluded.last_name,
				gender=excluded.gender,
				sexual_preference=excluded.sexual_preference,
				biography=excluded.biography;`);
		const deleteTags = this.db.prepare<[string]>(`DELETE FROM tags WHERE user_id = ?`);
		const insertTag = this.db.prepare<[string, string, string]>(
			`INSERT INTO tags (id, user_id, tag) VALUES (?, ?, ?)`
		);

		const profileImageIsSet = await this.profileImageIsSet(id);

		return new Promise((resolve, reject) => {
			try {
				const transaction = this.db.transaction(
					(id: string, profileTest: ProfileWithoutPicturesAndId) => {
						insertIntoProfile.run(
							id,
							profileTest.firstName,
							profileTest.lastName,
							profileTest.gender.toString(),
							profileTest.sexualPreference.toString(),
							profileTest.biography,
							profileTest.age
						);
						deleteTags.run(id);
						profileTest.tags.forEach((tag) => {
							insertTag.run(uuidv4(), id, tag);
						});
						if (profileImageIsSet) {
							this.upsertProfileIsSetup(id, true);
						}
					}
				);
				transaction(id, info);

				const inserted_filename: Array<string | null> = [];
				resolve(inserted_filename);
			} catch (e) {
				reject(new UserRepositoryError(`Something went wrong creating user: ${e}`, e));
			}
		});
	}

	public async profileInfoIsSet(userId: string): Promise<boolean> {
		try {
			const sql = `SELECT count(*) AS cnt
						FROM profile_info AS p
						INNER JOIN tags AS t ON p.user_id = t.user_id
						WHERE p.user_id =  ?
						AND p.first_name IS NOT NULL
						AND p.last_name IS NOT NULL
						AND p.gender IS NOT NULL
						AND p.biography IS NOT NULL
						AND p.age IS NOT NULL
						AND p.sexual_preference IS NOT NULL
						AND t.tag IS NOT NULL;`;
			const qu = this.db.prepare<string, { cnt: number }>(sql);
			const res = qu.get(userId);
			return res && res.cnt == 0 ? false : true;
		} catch (error) {
			throw new UserRepositoryError('Error occurs trying to check if profileInfo is set', error);
		}
	}

	public async updateEmailIsSetup(userId: string, val: boolean) {
		try {
			const tmp: number = val ? 1 : 0;
			const updateProfileSet = this.db.prepare<[number, string]>(
				'UPDATE users SET email_is_setup = ? WHERE id = ?'
			);
			updateProfileSet.run(tmp, userId);
		} catch (error) {
			throw new UserRepositoryError(
				'Error occurs trying to update email_is_setup for user:' + userId,
				error
			);
		}
	}

	public async allOtherUsers(id: string): Promise<string[]> {
		return new Promise((resolve, reject) => {
			try {
				const result = this.db
					.prepare<string, { id: string }>(
						`SELECT id
   						FROM users
						  WHERE id != ? AND profile_is_setup = 1`
					)
					.all(id)
					.map((user) => user.id);
				resolve(result);
			} catch (e) {
				reject(new UserRepositoryError('Something went wrong fetching other users', e));
			}
		});
	}

	public user(id: string): Promise<User | null> {
		return new Promise((resolve, reject) => {
			try {
				const result = this.db
					.prepare<
						string,
						UserWithPassword
					>('SELECT id, email, username, profile_is_setup, email_is_setup FROM users WHERE id = ?')
					.get(id);
				if (!result) {
					resolve(null);
				}
				const camelCaseObject = _.mapKeys(result, (__, key) => _.camelCase(key)) as any;
				camelCaseObject.profileIsSetup = camelCaseObject.profileIsSetup === 0 ? false : true;
				camelCaseObject.emailIsSetup = camelCaseObject.email_is_setup === 0 ? false : true;
				resolve(camelCaseObject as User);
			} catch (e) {
				reject(new UserRepositoryError('Something went wrong fetching user for id: ' + id, e));
			}
		});
	}

	public upsertProfileIsSetup(userId: string, flag: boolean) {
		try {
			const val = flag ? 1 : 0;
			const sql = this.db.prepare<[number, string]>(
				`UPDATE users SET profile_is_setup = ? WHERE id = ?`
			);
			const res = sql.run(val, userId);
			return res;
		} catch (error) {
			throw new UserRepositoryError('Error occur in the upsertProfileIsSetup function', error);
		}
	}

	public async upsertPasswordIsSet(userId: string, flag: boolean) {
		try {
			const val = flag ? 1 : 0;
			const sql = this.db.prepare<[number, string]>(
				`UPDATE users SET password_is_set = ? WHERE id = ?`
			);
			const res = sql.run(val, userId);
			return res;
		} catch (error) {
			throw new UserRepositoryError('Error occur in the upsertProfileIsSetup function', error);
		}
	}

	public async createUser(
		user: UserWithoutProfileSetup,
		password: string
	): Promise<UserWithoutProfileSetup> {
		const passwordHash = await hash(password, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});
		return new Promise((resolve, reject) => {
			try {
				const result = this.db
					.prepare<[string, string, string, string], ToSnakeCase<UserWithoutProfileSetup>>(
						`INSERT INTO users (id, email, username, password_hash)
						VALUES (?, ?, ?, ?)
						RETURNING id, email, username;`
					)
					.get(user.id, user.email, user.username, passwordHash);
				if (!result) {
					return reject(
						new UserRepositoryError(`Something went wrong creating user: ${user.email}`, null)
					);
				}
				resolve(result);
			} catch (e) {
				if (e instanceof SqliteError) {
					if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
						const regex = /users\.(.*)/;
						const match = e.message.match(regex);
						if (!match) {
							reject(new UserRepositoryError(`Duplicate entry for user: ${user.email}`, 'unkown'));
						}
						reject(
							new DuplicateEntryError(
								`Duplicate entry for user: ${user.email}`,
								(match as RegExpMatchArray)[1]
							)
						);
					}
				}
				reject(new UserRepositoryError(`Something went wrong creating user: ${e}`, e));
			}
		});
	}

	public async updateUserEmail(userId: string, email: string) {
		try {
			const sql = this.db.prepare<[string, string]>(`UPDATE users SET email = ? WHERE id = ?`);
			sql.run(email, userId);
		} catch (error) {
			throw new UserRepositoryError(
				'error occur trying to update new email for user:' + userId,
				error
			);
		}
	}

	public async updateUserPswd(userId: string, password: string) {
		try {
			const passwordHash = await hash(password, {
				memoryCost: 19456,
				timeCost: 2,
				outputLen: 32,
				parallelism: 1
			});

			const sql = this.db.prepare<[string, string]>(
				`UPDATE users SET password_hash = ? WHERE id = ?`
			);
			sql.run(passwordHash, userId);
		} catch (error) {
			throw new UserRepositoryError(
				'error occur trying to update new password for user:' + userId,
				error
			);
		}
	}

	public async deleteUserImage(userId: string, order: number): Promise<void> {
		try {
			await this.imageRepo.deleteImage(userId, order);
		} catch (error) {
			throw new UserRepositoryError('Error occurs trying to delete image for: ' + userId, error);
		}
	}

	public async userImage(userId: string, order: number): Promise<Buffer | null> {
		try {
			return await this.imageRepo.image(userId, order);
		} catch (error) {
			throw new UserRepositoryError('Error occurs trying to get image for: ' + userId, error);
		}
	}

	public async saveUserImage(userId: string, order: number, image: Buffer): Promise<number> {
		try {
			const res_order = await this.imageRepo.upsertImage(userId, order, image);
			const profileInfoIsSet = await this.profileInfoIsSet(userId);
			if (profileInfoIsSet && order === 0) {
				this.upsertProfileIsSetup(userId, true);
			}
			return res_order;
		} catch (error) {
			throw new UserRepositoryError('Error occurs trying to save image for: ' + userId, error);
		}
	}

	public async profileImageIsSet(userId: string): Promise<boolean> {
		return this.imageRepo.checkIfImageProfileIsSet(userId);
	}

	public async upsertLocation(userId: string, longitude: number, latitude: number) {
		try {
			const sql = `INSERT INTO location (user_id, longitude, latitude)
						VALUES (?, ?, ?)
						ON CONFLICT(user_id)
						DO UPDATE SET
							longitude = excluded.longitude,
							latitude = excluded.latitude;`;

			const req = this.db.prepare<[string, number, number]>(sql);
			req.run(userId, longitude, latitude);
		} catch (e) {
			throw new UserRepositoryError(
				'Error occur trying to upsert location coordinate for user: ' + userId,
				e
			);
		}
	}

	public async location(userId: string) {
		try {
			const sql = `SELECT longitude, latitude FROM location WHERE user_id = ?`;

			const req = this.db.prepare<string>(sql);
			const ret = req.get(userId);
			return ret;
		} catch (e) {
			throw new UserRepositoryError(
				'Error occur trying to get location coordinate for user: ' + userId,
				e
			);
		}
	}
}

export { UserRepository, UserRepositoryError, DuplicateEntryError };
export type {
	UserWithPassword,
	UserWithoutProfileSetup,
	ProfileWithoutPicturesAndId,
	ProfilePreview
};
