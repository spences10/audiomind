import { describe, expect, test } from 'vite-plus/test';
import { open_db } from './db.ts';
import {
	add_media,
	add_transcript,
	delete_media,
	list_media,
	search_segments,
	to_fts_query,
} from './library.ts';
import schema from './schema.sql?raw';
import type { Transcript } from './transcribe.ts';

// One-hot vectors make nearest-neighbour results predictable
const vector = (index: number) => {
	const v = Array.from({ length: 1536 }, () => 0);
	v[index] = 1;
	return v;
};

const transcript: Transcript = {
	provider: 'deepgram',
	model: 'nova-3',
	duration: 30,
	segments: [
		{ text: 'Welcome to the show', start: 0, end: 5, speaker: 0 },
		{ text: 'SQLite is a database', start: 5, end: 10, speaker: 1 },
		{ text: 'Thanks for listening', start: 10, end: 15, speaker: 0 },
	],
};

const setup = () => {
	const db = open_db(':memory:', schema);
	const ids = add_media(
		db,
		{ title: 'Episode one' },
		transcript,
		[vector(0), vector(1), vector(2)],
		'test-model',
	);
	return { db, ...ids };
};

describe('library', () => {
	test('opening twice reuses the schema', () => {
		const db = open_db(':memory:', schema);
		expect(() => db.exec(schema)).not.toThrow();
	});

	test('finds a segment by vector', () => {
		const { db } = setup();
		const [top] = search_segments(db, vector(2), '', 1);
		expect(top.text).toBe('Thanks for listening');
		expect(top.media_title).toBe('Episode one');
		expect(top.speaker).toBe(0);
	});

	test('keyword match lifts a segment the vector ranks lower', () => {
		const { db } = setup();
		const [top] = search_segments(db, vector(0), 'sqlite', 3);
		// vector(0) alone ranks "Welcome" first; FTS adds "SQLite"
		const texts = search_segments(db, vector(0), 'sqlite', 3).map(
			(r) => r.text,
		);
		expect(texts).toContain('SQLite is a database');
		expect(top.score).toBeGreaterThan(0);
	});

	test('adds a second transcript to the same media', () => {
		const { db, media_id } = setup();
		add_transcript(
			db,
			media_id,
			{ ...transcript, provider: 'openai', model: 'whisper-1' },
			[vector(3), vector(4), vector(5)],
			'test-model',
		);
		const [media] = list_media(db);
		expect(media.transcripts).toHaveLength(2);
	});

	test('delete removes segments, vectors and FTS rows', () => {
		const { db, media_id } = setup();
		expect(delete_media(db, media_id)).toBe(true);
		const count = (sql: string) =>
			Number(
				(db.prepare(sql).get() as { n: number | bigint } | undefined)
					?.n,
			);
		expect(count('SELECT COUNT(*) AS n FROM segments')).toBe(0);
		expect(count('SELECT COUNT(*) AS n FROM segments_vec')).toBe(0);
		expect(
			count(
				"SELECT COUNT(*) AS n FROM segments_fts WHERE segments_fts MATCH 'sqlite'",
			),
		).toBe(0);
	});

	test('rejects mismatched embeddings', () => {
		const db = open_db(':memory:', schema);
		expect(() =>
			add_media(db, { title: 'x' }, transcript, [vector(0)], 'm'),
		).toThrow('Got 1 embeddings for 3 segments');
	});
});

describe('to_fts_query', () => {
	test('quotes words and drops FTS syntax', () => {
		expect(to_fts_query('what is "NEAR" (sqlite)*')).toBe(
			'"what" OR "is" OR "NEAR" OR "sqlite"',
		);
	});

	test('returns empty for no words', () => {
		expect(to_fts_query('?!')).toBe('');
	});
});
