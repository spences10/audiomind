import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '../../../data/audiomind.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
	if (!db) {
		throw new Error('Database not initialized. Call initDatabase() first.');
	}
	return db;
}

export function initDatabase(): void {
	if (db) return;

	db = new Database(DB_PATH);
	sqliteVec.load(db);

	const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
	db.exec(schema);

	console.log('Database initialized');
}
