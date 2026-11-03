// Shared by the app and the CLI, so no $app or #lib imports here
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import * as sqlite_vec from 'sqlite-vec';

export function open_db(path: string, schema: string): DatabaseSync {
	const in_memory = path === ':memory:';
	if (!in_memory) mkdirSync(dirname(path), { recursive: true });

	const db = new DatabaseSync(path, { allowExtension: true });
	sqlite_vec.load(db);
	db.exec('PRAGMA foreign_keys = ON');
	db.exec('PRAGMA busy_timeout = 5000');

	if (!in_memory) {
		db.exec('PRAGMA journal_mode = WAL');
		db.exec('PRAGMA synchronous = NORMAL');
	}

	db.exec(schema);
	return db;
}

export function transaction<T>(db: DatabaseSync, fn: () => T): T {
	db.exec('BEGIN');
	try {
		const result = fn();
		db.exec('COMMIT');
		return result;
	} catch (error) {
		db.exec('ROLLBACK');
		throw error;
	}
}
