import { TURSO_AUTH_TOKEN, TURSO_URL } from '$env/static/private';
import { createClient } from '@libsql/client';

export const db = createClient({
	url: TURSO_URL,
	authToken: TURSO_AUTH_TOKEN,
});

// Initialize database tables
export async function init_database() {
	await db.execute(`
		CREATE TABLE IF NOT EXISTS transcripts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			episode_title TEXT,
			segment_text TEXT,
			start_time REAL,
			end_time REAL
		)
	`);

	await db.execute(`
		CREATE TABLE IF NOT EXISTS embeddings (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			transcript_id INTEGER,
			embedding BLOB,
			FOREIGN KEY(transcript_id) REFERENCES transcripts(id)
		)
	`);
}
