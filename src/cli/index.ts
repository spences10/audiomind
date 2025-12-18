#!/usr/bin/env node

import { defineCommand, runMain } from 'citty';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import * as sqlite_vec from 'sqlite-vec';

// Resolve paths relative to project root
const PROJECT_ROOT = resolve(import.meta.dirname, '../..');
const DB_PATH = resolve(PROJECT_ROOT, 'data/audiomind.db');
const SCHEMA_PATH = resolve(PROJECT_ROOT, 'src/lib/server/schema.sql');

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;

// --- Types ---
interface Segment {
	text: string;
	start: number;
	end: number;
}

// --- Output ---
function output(data: unknown): void {
	console.log(JSON.stringify(data, null, 2));
}

// --- Database ---
function get_db(): Database.Database {
	const db = new Database(DB_PATH);
	sqlite_vec.load(db);
	return db;
}

// --- Deepgram Transcription ---
async function transcribe_audio(audio_path: string): Promise<unknown> {
	if (!DEEPGRAM_API_KEY) throw new Error('DEEPGRAM_API_KEY not set');

	const audio_buffer = readFileSync(audio_path);
	const content_type = audio_path.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';

	const response = await fetch(
		'https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&paragraphs=true&utterances=true',
		{
			method: 'POST',
			headers: {
				Authorization: `Token ${DEEPGRAM_API_KEY}`,
				'Content-Type': content_type,
			},
			body: audio_buffer,
		},
	);

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Deepgram error: ${response.status} ${error}`);
	}

	return response.json();
}

// --- Voyage Embeddings ---
async function embed_texts(texts: string[]): Promise<number[][]> {
	if (!VOYAGE_API_KEY) throw new Error('VOYAGE_API_KEY not set');

	const response = await fetch('https://api.voyageai.com/v1/embeddings', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${VOYAGE_API_KEY}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			input: texts,
			model: 'voyage-3.5-lite',
			input_type: 'document',
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Voyage error: ${response.status} ${error}`);
	}

	const data = await response.json();
	return data.data.map((d: { embedding: number[] }) => d.embedding);
}

async function embed_query_text(text: string): Promise<number[]> {
	if (!VOYAGE_API_KEY) throw new Error('VOYAGE_API_KEY not set');

	const response = await fetch('https://api.voyageai.com/v1/embeddings', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${VOYAGE_API_KEY}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			input: text,
			model: 'voyage-3.5-lite',
			input_type: 'query',
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Voyage error: ${response.status} ${error}`);
	}

	const data = await response.json();
	return data.data[0].embedding;
}

// --- Parse Transcript into Segments ---
function parse_transcript(deepgram_response: unknown): Segment[] {
	const response = deepgram_response as {
		results?: {
			channels?: Array<{
				alternatives?: Array<{
					paragraphs?: {
						paragraphs?: Array<{ sentences?: Array<{ text: string }>; start?: number; end?: number }>;
					};
				}>;
			}>;
			utterances?: Array<{ transcript: string; start: number; end: number }>;
		};
	};

	const paragraphs = response?.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.paragraphs;

	if (!paragraphs) {
		const utterances = response?.results?.utterances;
		if (utterances) {
			return utterances.map((u) => ({
				text: u.transcript,
				start: u.start,
				end: u.end,
			}));
		}
		throw new Error('No paragraphs or utterances in transcript');
	}

	return paragraphs.map((p) => ({
		text: p.sentences?.map((s) => s.text).join(' ') || '',
		start: p.start || 0,
		end: p.end || 0,
	}));
}

// --- Commands ---
const init = defineCommand({
	meta: {
		name: 'init',
		description: 'Initialize the SQLite database',
	},
	run() {
		const db = get_db();
		const schema = readFileSync(SCHEMA_PATH, 'utf-8');
		db.exec(schema);
		db.close();
		output({ ok: true, message: 'Database initialized', path: DB_PATH });
	},
});

const transcribe = defineCommand({
	meta: {
		name: 'transcribe',
		description: 'Transcribe an audio file using Deepgram',
	},
	args: {
		audio: {
			type: 'positional',
			description: 'Path to the audio file',
			required: true,
		},
		output: {
			type: 'string',
			alias: 'o',
			description: 'Output path for transcript JSON',
		},
	},
	async run({ args }) {
		const result = await transcribe_audio(args.audio);
		const segments = parse_transcript(result);

		if (args.output) {
			writeFileSync(args.output, JSON.stringify(result, null, 2));
		}

		output({
			ok: true,
			segments: segments.length,
			output: args.output || null,
			transcript: result,
		});
	},
});

const embed = defineCommand({
	meta: {
		name: 'embed',
		description: 'Generate embeddings for a transcript',
	},
	args: {
		transcript: {
			type: 'positional',
			description: 'Path to transcript JSON file',
			required: true,
		},
		output: {
			type: 'string',
			alias: 'o',
			description: 'Output path for embeddings JSON',
		},
	},
	async run({ args }) {
		const transcript = JSON.parse(readFileSync(args.transcript, 'utf-8'));
		const segments = parse_transcript(transcript);
		const texts = segments.map((s) => s.text);

		const batch_size = 100;
		const all_embeddings: number[][] = [];

		for (let i = 0; i < texts.length; i += batch_size) {
			const batch = texts.slice(i, i + batch_size);
			const embeddings = await embed_texts(batch);
			all_embeddings.push(...embeddings);
		}

		const output_data = { segments, embeddings: all_embeddings };

		if (args.output) {
			writeFileSync(args.output, JSON.stringify(output_data, null, 2));
		}

		output({
			ok: true,
			segments: segments.length,
			embeddings: all_embeddings.length,
			output: args.output || null,
		});
	},
});

const ingest = defineCommand({
	meta: {
		name: 'ingest',
		description: 'Insert embeddings into the database',
	},
	args: {
		embeddings: {
			type: 'positional',
			description: 'Path to embeddings JSON file',
			required: true,
		},
		podcast: {
			type: 'string',
			alias: 'p',
			description: 'Podcast name',
			required: true,
		},
		episode: {
			type: 'string',
			alias: 'e',
			description: 'Episode title',
			required: true,
		},
	},
	run({ args }) {
		const data = JSON.parse(readFileSync(args.embeddings, 'utf-8'));
		const db = get_db();

		let podcast = db.prepare('SELECT id FROM podcasts WHERE name = ?').get(args.podcast) as { id: number } | undefined;

		if (!podcast) {
			const result = db.prepare('INSERT INTO podcasts (name) VALUES (?)').run(args.podcast);
			podcast = { id: Number(result.lastInsertRowid) };
		}

		const episode_result = db
			.prepare('INSERT INTO episodes (podcast_id, title) VALUES (?, ?)')
			.run(podcast.id, args.episode);
		const episode_id = Number(episode_result.lastInsertRowid);

		const insert_segment = db.prepare(
			'INSERT INTO segments (episode_id, text, start_time, end_time) VALUES (?, ?, ?, ?)',
		);

		const transaction = db.transaction(() => {
			for (let i = 0; i < data.segments.length; i++) {
				const seg = data.segments[i];
				const result = insert_segment.run(episode_id, seg.text, seg.start, seg.end);
				const segment_id = Number(result.lastInsertRowid);
				const embedding_json = JSON.stringify(data.embeddings[i]);
				db.prepare(`INSERT INTO segments_vec (rowid, embedding) VALUES (CAST(? AS INTEGER), vec_f32(?))`).run(
					segment_id,
					embedding_json,
				);
			}
		});

		transaction();
		db.close();

		output({
			ok: true,
			podcast: { id: podcast.id, name: args.podcast },
			episode: { id: episode_id, title: args.episode },
			segments: data.segments.length,
		});
	},
});

const process_cmd = defineCommand({
	meta: {
		name: 'process',
		description: 'Full pipeline: transcribe, embed, and ingest an audio file',
	},
	args: {
		audio: {
			type: 'positional',
			description: 'Path to the audio file',
			required: true,
		},
		podcast: {
			type: 'string',
			alias: 'p',
			description: 'Podcast name',
			required: true,
		},
		episode: {
			type: 'string',
			alias: 'e',
			description: 'Episode title',
			required: true,
		},
	},
	async run({ args }) {
		// 1. Transcribe
		const transcript = await transcribe_audio(args.audio);
		const segments = parse_transcript(transcript);

		// 2. Embed
		const texts = segments.map((s) => s.text);
		const batch_size = 100;
		const all_embeddings: number[][] = [];

		for (let i = 0; i < texts.length; i += batch_size) {
			const batch = texts.slice(i, i + batch_size);
			const embeddings = await embed_texts(batch);
			all_embeddings.push(...embeddings);
		}

		// 3. Ingest
		const db = get_db();

		let podcast = db.prepare('SELECT id FROM podcasts WHERE name = ?').get(args.podcast) as { id: number } | undefined;

		if (!podcast) {
			const result = db.prepare('INSERT INTO podcasts (name) VALUES (?)').run(args.podcast);
			podcast = { id: Number(result.lastInsertRowid) };
		}

		const episode_result = db
			.prepare('INSERT INTO episodes (podcast_id, title) VALUES (?, ?)')
			.run(podcast.id, args.episode);
		const episode_id = Number(episode_result.lastInsertRowid);

		const insert_segment = db.prepare(
			'INSERT INTO segments (episode_id, text, start_time, end_time) VALUES (?, ?, ?, ?)',
		);

		const transaction = db.transaction(() => {
			for (let i = 0; i < segments.length; i++) {
				const seg = segments[i];
				const result = insert_segment.run(episode_id, seg.text, seg.start, seg.end);
				const segment_id = Number(result.lastInsertRowid);
				const embedding_json = JSON.stringify(all_embeddings[i]);
				db.prepare(`INSERT INTO segments_vec (rowid, embedding) VALUES (CAST(? AS INTEGER), vec_f32(?))`).run(
					segment_id,
					embedding_json,
				);
			}
		});

		transaction();
		db.close();

		output({
			ok: true,
			podcast: { id: podcast.id, name: args.podcast },
			episode: { id: episode_id, title: args.episode },
			segments: segments.length,
			embeddings: all_embeddings.length,
		});
	},
});

const search = defineCommand({
	meta: {
		name: 'search',
		description: 'Search podcast segments using vector similarity',
	},
	args: {
		query: {
			type: 'positional',
			description: 'Search query text',
			required: true,
		},
		limit: {
			type: 'string',
			alias: 'n',
			description: 'Number of results (default: 10)',
			default: '10',
		},
		podcast: {
			type: 'string',
			alias: 'p',
			description: 'Filter by podcast name',
		},
	},
	async run({ args }) {
		const db = get_db();
		const query_embedding = await embed_query_text(args.query);
		const limit = parseInt(args.limit);

		let podcast_ids: number[] | undefined;
		if (args.podcast) {
			const podcast = db.prepare('SELECT id FROM podcasts WHERE name LIKE ?').get(`%${args.podcast}%`) as
				| { id: number }
				| undefined;
			if (podcast) podcast_ids = [podcast.id];
		}

		const query_vec = JSON.stringify(query_embedding);

		let sql = `
			SELECT
				sv.rowid as segment_id,
				sv.distance,
				s.text,
				s.start_time,
				s.end_time,
				e.title as episode_title,
				e.id as episode_id,
				p.name as podcast_name,
				p.id as podcast_id
			FROM segments_vec sv
			JOIN segments s ON sv.rowid = s.id
			JOIN episodes e ON s.episode_id = e.id
			JOIN podcasts p ON e.podcast_id = p.id
			WHERE sv.embedding MATCH ? AND k = ${limit}
		`;

		if (podcast_ids?.length) {
			sql += ` AND p.id IN (${podcast_ids.join(',')})`;
		}

		sql += ` ORDER BY sv.distance`;

		const results = db.prepare(sql).all(query_vec);
		db.close();

		output({
			ok: true,
			query: args.query,
			limit,
			results,
		});
	},
});

const list = defineCommand({
	meta: {
		name: 'list',
		description: 'List all podcasts and episodes',
	},
	run() {
		const db = get_db();

		const podcasts = db
			.prepare(
				`
			SELECT p.*, COUNT(e.id) as episode_count
			FROM podcasts p
			LEFT JOIN episodes e ON p.id = e.podcast_id
			GROUP BY p.id
		`,
			)
			.all();

		const episodes = db
			.prepare(
				`
			SELECT e.*, p.name as podcast_name,
				(SELECT COUNT(*) FROM segments WHERE episode_id = e.id) as segment_count
			FROM episodes e
			JOIN podcasts p ON e.podcast_id = p.id
			ORDER BY e.id DESC
		`,
			)
			.all();

		db.close();

		output({ ok: true, podcasts, episodes });
	},
});

// --- Main ---
const main = defineCommand({
	meta: {
		name: 'audiomind',
		description: 'CLI for managing podcast transcriptions and semantic search',
		version: '0.0.1',
	},
	subCommands: {
		init,
		transcribe,
		embed,
		ingest,
		process: process_cmd,
		search,
		list,
	},
});

runMain(main);
