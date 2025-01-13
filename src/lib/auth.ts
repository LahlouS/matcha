import { Lucia, type Adapter } from 'lucia';
import { BetterSqlite3Adapter } from '@lucia-auth/adapter-sqlite';
import { getDb } from './database/database';
import type { Database } from 'better-sqlite3';

export function adapter(db: Database) {
	const adapter = new BetterSqlite3Adapter(db, {
		user: 'users',
		session: 'sessions'
	});
	return adapter;
}

export function createLuciaInstance(luciaAdapter: Adapter) {
	return new Lucia(luciaAdapter, {
		sessionCookie: {
			attributes: {
				// If ever go to production need to change this to true
				secure: false
			}
		},
		getUserAttributes: (attributes: DatabaseUserAttributes) => {
			return {
				username: attributes.username,
				profileIsSetup: attributes.profile_is_setup === 0 ? false : true,
				email: attributes.email,
				emailIsSetup: attributes.email_is_setup === 0 ? false : true,
				passwordIsSet: attributes.password_is_set === 0 ? false : true
			};
		}
	});
}

let _lucia: ReturnType<typeof createLuciaInstance> | null = null;

export const lucia = new Proxy(
	{},
	{
		get: (_, prop) => {
			if (!_lucia) {
				_lucia = createLuciaInstance(adapter(getDb()));
			}
			return _lucia[prop as keyof typeof _lucia];
		}
	}
) as ReturnType<typeof createLuciaInstance>;

interface DatabaseUserAttributes {
	username: string;
	profile_is_setup: number;
	email: string;
	email_is_setup: number;
	password_is_set: number;
}

declare module 'lucia' {
	interface Register {
		Lucia: ReturnType<typeof createLuciaInstance>;
		DatabaseUserAttributes: DatabaseUserAttributes;
	}
}
