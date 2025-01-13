import runMigrations, { getDb, LOCK_FILE_PATH, MIGRATIONS_PATH } from './database';

const db = getDb();

runMigrations(db, MIGRATIONS_PATH, LOCK_FILE_PATH, false);
