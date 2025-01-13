import { existsSync, unlinkSync } from 'fs';
import runMigrations, { DATABASE_PATH, getDb, LOCK_FILE_PATH, MIGRATIONS_PATH } from './database';

if (existsSync(DATABASE_PATH)) {
	unlinkSync(DATABASE_PATH);
	unlinkSync(LOCK_FILE_PATH);
	console.log('Database file deleted.');
} else {
	console.log('Database file does not exist.');
}

const db = getDb();

await runMigrations(db, MIGRATIONS_PATH, LOCK_FILE_PATH, false);
