import { DATABASE_PATH } from '$app/env/private';
import type { DatabaseSync } from 'node:sqlite';
import { open_db } from './db.ts';
// Bundled as a string so the built server doesn't read it from disk
import schema from './schema.sql?raw';

let db: DatabaseSync | undefined;

// Opened on first use, not at import, so builds never touch the file
export function get_db(): DatabaseSync {
	db ??= open_db(DATABASE_PATH, schema);
	return db;
}
