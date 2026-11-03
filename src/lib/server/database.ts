import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
// Bundled as a string so the built server doesn't read it from disk
import schema from './schema.sql?raw';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '../../../data/audiomind.db');

let db: Database.Database | null = null;

export function get_db(): Database.Database {
	if (!db) {
		throw new Error(
			'Database not initialized. Call init_database() first.',
		);
	}
	return db;
}

export function init_database(): void {
	if (db) return;

	const db_dir = dirname(DB_PATH);
	if (!existsSync(db_dir)) {
		mkdirSync(db_dir, { recursive: true });
	}

	db = new Database(DB_PATH);
	sqliteVec.load(db);

	db.exec(schema);

	console.log('Database initialized');
}
