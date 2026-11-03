// Shared by the app and the CLI, so no $app or #lib imports here
import type { DatabaseSync } from 'node:sqlite';
import { transaction } from './db.ts';
import type { Transcript } from './transcribe.ts';

export interface MediaInput {
	title: string;
	source_url?: string | null;
	duration?: number | null;
}

export interface SearchResult {
	segment_id: number;
	text: string;
	speaker: number | null;
	start_time: number;
	end_time: number;
	media_id: number;
	media_title: string;
	score: number;
}

/** Saves a media item, its transcript and segment embeddings in one transaction. */
export function add_media(
	db: DatabaseSync,
	media: MediaInput,
	transcript: Transcript,
	embeddings: number[][],
	embedding_model: string,
): { media_id: number; transcript_id: number } {
	if (embeddings.length !== transcript.segments.length) {
		throw new Error(
			`Got ${embeddings.length} embeddings for ${transcript.segments.length} segments`,
		);
	}

	return transaction(db, () => {
		const media_id = Number(
			db
				.prepare(
					'INSERT INTO media (title, source_url, duration) VALUES (?, ?, ?)',
				)
				.run(
					media.title,
					media.source_url ?? null,
					media.duration ?? transcript.duration,
				).lastInsertRowid,
		);
		const transcript_id = add_transcript_rows(
			db,
			media_id,
			transcript,
			embeddings,
			embedding_model,
		);
		return { media_id, transcript_id };
	});
}

/** Adds another transcript to an existing media item. */
export function add_transcript(
	db: DatabaseSync,
	media_id: number,
	transcript: Transcript,
	embeddings: number[][],
	embedding_model: string,
): number {
	return transaction(db, () =>
		add_transcript_rows(
			db,
			media_id,
			transcript,
			embeddings,
			embedding_model,
		),
	);
}

function add_transcript_rows(
	db: DatabaseSync,
	media_id: number,
	transcript: Transcript,
	embeddings: number[][],
	embedding_model: string,
): number {
	const transcript_id = Number(
		db
			.prepare(
				'INSERT INTO transcripts (media_id, provider, model, embedding_model) VALUES (?, ?, ?, ?)',
			)
			.run(
				media_id,
				transcript.provider,
				transcript.model,
				embedding_model,
			).lastInsertRowid,
	);

	const insert_segment = db.prepare(
		'INSERT INTO segments (transcript_id, position, speaker, start_time, end_time, text) VALUES (?, ?, ?, ?, ?, ?)',
	);
	const insert_vec = db.prepare(
		'INSERT INTO segments_vec (rowid, embedding) VALUES (?, ?)',
	);

	transcript.segments.forEach((segment, position) => {
		const { lastInsertRowid } = insert_segment.run(
			transcript_id,
			position,
			segment.speaker,
			segment.start,
			segment.end,
			segment.text,
		);
		// vec0 needs an integer rowid, so bind it as a BigInt
		insert_vec.run(
			BigInt(lastInsertRowid),
			new Float32Array(embeddings[position]),
		);
	});

	return transcript_id;
}

// Reciprocal rank fusion constant; 60 is the usual default
const RRF_K = 60;

/** Hybrid search: vector similarity and FTS5 keywords, merged by rank. */
export function search_segments(
	db: DatabaseSync,
	query_embedding: number[],
	query_text: string,
	limit = 5,
): SearchResult[] {
	const candidates = limit * 4;
	const scores = new Map<number, number>();
	const add_ranks = (ids: number[]) =>
		ids.forEach((id, rank) =>
			scores.set(id, (scores.get(id) ?? 0) + 1 / (RRF_K + rank + 1)),
		);

	add_ranks(
		db
			.prepare(
				'SELECT rowid FROM segments_vec WHERE embedding MATCH ? AND k = ? ORDER BY distance',
			)
			.all(new Float32Array(query_embedding), candidates)
			.map((row) => Number(row.rowid)),
	);

	const fts_query = to_fts_query(query_text);
	if (fts_query) {
		add_ranks(
			db
				.prepare(
					'SELECT rowid FROM segments_fts WHERE segments_fts MATCH ? ORDER BY rank LIMIT ?',
				)
				.all(fts_query, candidates)
				.map((row) => Number(row.rowid)),
		);
	}

	const top = [...scores.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, limit);
	if (top.length === 0) return [];

	const rows = db
		.prepare(
			`SELECT s.id AS segment_id, s.text, s.speaker, s.start_time, s.end_time,
				m.id AS media_id, m.title AS media_title
			FROM segments s
			JOIN transcripts t ON t.id = s.transcript_id
			JOIN media m ON m.id = t.media_id
			WHERE s.id IN (${top.map(() => '?').join(',')})`,
		)
		.all(...top.map(([id]) => id)) as unknown as Omit<
		SearchResult,
		'score'
	>[];

	const by_id = new Map(rows.map((row) => [row.segment_id, row]));
	return top.flatMap(([id, score]) => {
		const row = by_id.get(id);
		return row ? [{ ...row, score }] : [];
	});
}

/** Quotes each word so user text can't break FTS5 query syntax. */
export function to_fts_query(text: string): string {
	return (text.match(/[\p{L}\p{N}]+/gu) ?? [])
		.map((word) => `"${word}"`)
		.join(' OR ');
}

export function list_media(db: DatabaseSync) {
	return db
		.prepare(
			`SELECT m.id, m.title, m.source_url, m.duration, m.created_at,
				(SELECT json_group_array(json_object('id', t.id, 'provider', t.provider, 'model', t.model,
					'segments', (SELECT COUNT(*) FROM segments s WHERE s.transcript_id = t.id)))
				FROM transcripts t WHERE t.media_id = m.id) AS transcripts
			FROM media m
			ORDER BY m.id DESC`,
		)
		.all()
		.map((row) => ({
			...row,
			transcripts: JSON.parse(String(row.transcripts)),
		}));
}

export function rename_media(
	db: DatabaseSync,
	id: number,
	title: string,
): boolean {
	return (
		db
			.prepare('UPDATE media SET title = ? WHERE id = ?')
			.run(title, id).changes > 0
	);
}

/** Deletes a media item; triggers clean up the vector and FTS rows. */
export function delete_media(db: DatabaseSync, id: number): boolean {
	return transaction(
		db,
		() =>
			db.prepare('DELETE FROM media WHERE id = ?').run(id).changes >
			0,
	);
}
