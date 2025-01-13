import type { UserRepository } from '$lib/userRepository';
import { verify } from '@node-rs/argon2';
import type { Cookie, Lucia } from 'lucia';

export type AuthServiceErrorTypes = 'INCORRECT_USERNAME_OR_PASSWORD' | 'ERROR_CREATING_SESSION';

export class AuthServiceError extends Error {
	type: string;
	constructor(message: string, type: AuthServiceErrorTypes) {
		super(message);
		this.name = 'AuthServiceError';
		this.type = type;
	}
}

export class AuthService {
	constructor(
		private userRepository: UserRepository,
		private lucia: Lucia
	) {}

	public async signIn(username: string, password: string): Promise<Cookie> {
		const user = await this.userRepository.userByUsername(username);
		if (!user) {
			throw new AuthServiceError(
				'Incorrect username or password',
				'INCORRECT_USERNAME_OR_PASSWORD'
			);
		}
		const validPassword = await verify(user.passwordHash, password, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});
		if (!validPassword) {
			throw new AuthServiceError(
				'Incorrect username or password',
				'INCORRECT_USERNAME_OR_PASSWORD'
			);
		}
		try {
			const session = await this.lucia.createSession(user.id, {});
			return this.lucia.createSessionCookie(session.id);
		} catch (e) {
			throw new AuthServiceError('Error creating session', 'ERROR_CREATING_SESSION');
		}
	}
}
