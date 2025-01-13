import Database from 'better-sqlite3';
import fs from 'fs';
import type { PathOrFileDescriptor, PathLike } from 'fs';
import { createHash } from 'crypto';
import type { Database as DatabaseType } from 'better-sqlite3';

export const MIGRATIONS_PATH = 'migrations';
export const LOCK_FILE_PATH = 'database/migrations.lock';
export const DATABASE_PATH = 'database/database.db';

// singleton instance
let db: DatabaseType | null = null;

export function getDb(path: string = DATABASE_PATH): DatabaseType {
	if (!db) {
		db = Database(path);
	}
	return db;
}

export class MigrationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'MigrationError';
	}
}

async function getMigrationHashes(
	lockFilePath: PathOrFileDescriptor
): Promise<Record<string, string>> {
	try {
		const data = fs.readFileSync(lockFilePath, 'utf-8');
		return JSON.parse(data) || {};
	} catch (error) {
		if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
			return {};
		} else {
			throw error;
		}
	}
}

async function updateMigrationHashes(
	lockFilePath: PathOrFileDescriptor,
	hashes: Record<string, string>
) {
	fs.writeFileSync(lockFilePath, JSON.stringify(hashes, null, 2));
}

async function runMigrations(
	db: DatabaseType,
	migrationsPath: PathLike,
	lockFilePath: PathLike,
	silent = true
) {
	const migrationHashes = await getMigrationHashes(lockFilePath);
	try {
		const migrationFiles = fs.readdirSync(migrationsPath).filter((file) => file.endsWith('.sql'));

		for (const file of migrationFiles) {
			const migrationPath = `${migrationsPath}/${file}`;
			const migrationContent = fs.readFileSync(migrationPath, 'utf-8');
			const hash = createHash('sha256').update(migrationContent).digest('hex');

			if (migrationHashes[file]) {
				if (migrationHashes[file] !== hash) {
					throw new MigrationError(
						`Migration ${file} has changed. Please update the migration script or manually adjust the lock file.`
					);
				}
				if (!silent) {
					console.log(`Migration ${file} already executed, skipping...`);
				}
				continue;
			}

			db.exec(migrationContent);
			if (!silent) {
				console.log(`Migration ${file} executed.`);
			}
			migrationHashes[file] = hash;
		}
	} catch (e) {
		if (e instanceof MigrationError) {
			throw e;
		}
		throw new MigrationError('Migration failed: ' + String(e));
	} finally {
		await updateMigrationHashes(lockFilePath, migrationHashes);
	}
	if (!silent) {
		console.log('Migrations completed successfully.');
	}
}

export default runMigrations;
