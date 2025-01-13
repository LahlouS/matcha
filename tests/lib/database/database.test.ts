import { afterEach, beforeEach, describe, expect } from 'vitest';
import { itWithFixtures } from '../../fixtures';
import Database from 'better-sqlite3';
import temp from 'temp';
import fs from 'fs';
import path from 'path';
import runMigrations, { MigrationError, MIGRATIONS_PATH } from '$lib/database/database';
import type { Database as DatabaseType } from 'better-sqlite3';

describe('Sqlite migrations', () => {
	let tempMigrationsDir: string;
	let tempLockfilePath: string;
	let db: DatabaseType;

	beforeEach(() => {
		db = new Database(':memory:');
		tempMigrationsDir = temp.mkdirSync('migrations');
		tempLockfilePath = path.join(temp.mkdirSync('lock-file'), 'migrations.lock');
	});

	afterEach(() => {
		temp.cleanupSync();
	});

	itWithFixtures('Should migrate database without problem', async () => {
		fs.writeFileSync(
			path.join(tempMigrationsDir, 'create_table.sql'),
			`CREATE TABLE users (
            id TEXT PRIMARY KEY NOT NULL,
            email TEXT UNIQUE NOT NULL
            );`
		);

		await runMigrations(db, tempMigrationsDir, tempLockfilePath);
		// Twice since it should skip the second time
		await runMigrations(db, tempMigrationsDir, tempLockfilePath);

		const result = db
			.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users';")
			.get();
		expect(result).not.toBe(null);
	});

	itWithFixtures('should throw error for invalid migration file', async () => {
		fs.writeFileSync(
			path.join(tempMigrationsDir, 'create_table.sql'),
			`
			CREATE TABLE profiles (
			user_id INTEGER FOREIGN KEY user.id,
			gender TEXT NOT NULL,
			sex_preference TEXT NOT NULL,
			biography TEXT NOT NULL
			);
			`
		);
		try {
			await runMigrations(db, tempMigrationsDir, tempLockfilePath);
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(MigrationError);
		}
	});

	itWithFixtures('Should run current migrations without problem', async () => {
		await runMigrations(db, MIGRATIONS_PATH, tempLockfilePath);
	});

	itWithFixtures('Should throw error if migration is edited', async () => {
		const migrationPath = path.join(tempMigrationsDir, 'create_table.sql');
		fs.writeFileSync(
			migrationPath,
			`CREATE TABLE users (
            id TEXT PRIMARY KEY NOT NULL,
            email TEXT UNIQUE NOT NULL
            );`
		);

		await runMigrations(db, tempMigrationsDir, tempLockfilePath);
		// remove s from users
		fs.writeFileSync(
			migrationPath,
			`CREATE TABLE user (
            id TEXT PRIMARY KEY NOT NULL,
            email TEXT UNIQUE NOT NULL
            );`
		);

		try {
			await runMigrations(db, tempMigrationsDir, tempLockfilePath);
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(MigrationError);
		}
	});
});
