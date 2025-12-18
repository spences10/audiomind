#!/usr/bin/env node --experimental-strip-types --env-file=.env

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import * as sqlite_vec from 'sqlite-vec';

const DB_PATH = resolve(import.meta.dirname, 'data/audiomind.db');

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;

// --- Database ---
function get_db(): Database.Database {
	const db = new Database(DB_PATH);
	sqlite_vec.load(db);
	return db;
}

function init_db() {
	const db = get_db();
	const schema = readFileSync(
		resolve(import.meta.dirname, 'src/lib/server/schema.sql'),
		'utf-8',
	);
	db.exec(schema);
	db.close();
	console.log('Database initialized');
}

// --- Deepgram Transcription ---
async function transcribe(audio_path: string): Promise<any> {
	if (!DEEPGRAM_API_KEY) throw new Error('DEEPGRAM_API_KEY not set');

	const audio_buffer = readFileSync(audio_path);
	const content_type = audio_path.endsWith('.mp3')
		? 'audio/mpeg'
		: 'audio/wav';

	console.log(
		`Transcribing ${audio_path} (${(audio_buffer.length / 1024 / 1024).toFixed(2)} MB)...`,
	);

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
async function embed(texts: string[]): Promise<number[][]> {
	if (!VOYAGE_API_KEY) throw new Error('VOYAGE_API_KEY not set');

	console.log(
		`Generating embeddings for ${texts.length} segments...`,
	);

	const response = await fetch(
		'https://api.voyageai.com/v1/embeddings',
		{
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
		},
	);

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Voyage error: ${response.status} ${error}`);
	}

	const data = await response.json();
	return data.data.map((d: { embedding: number[] }) => d.embedding);
}

async function embed_query(text: string): Promise<number[]> {
	if (!VOYAGE_API_KEY) throw new Error('VOYAGE_API_KEY not set');

	const response = await fetch(
		'https://api.voyageai.com/v1/embeddings',
		{
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
		},
	);

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Voyage error: ${response.status} ${error}`);
	}

	const data = await response.json();
	return data.data[0].embedding;
}

// --- Parse Transcript into Segments ---
interface Segment {
	text: string;
	start: number;
	end: number;
}

function parse_transcript(deepgram_response: any): Segment[] {
	const paragraphs =
		deepgram_response?.results?.channels?.[0]?.alternatives?.[0]
			?.paragraphs?.paragraphs;

	if (!paragraphs) {
		// Fallback to utterances
		const utterances = deepgram_response?.results?.utterances;
		if (utterances) {
			return utterances.map((u: any) => ({
				text: u.transcript,
				start: u.start,
				end: u.end,
			}));
		}
		throw new Error('No paragraphs or utterances in transcript');
	}

	return paragraphs.map((p: any) => ({
		text: p.sentences?.map((s: any) => s.text).join(' ') || '',
		start: p.start || 0,
		end: p.end || 0,
	}));
}

// --- Ingest to Database ---
function ingest(
	db: Database.Database,
	podcast_name: string,
	episode_title: string,
	segments: Segment[],
	embeddings: number[][],
) {
	// Get or create podcast
	let podcast = db
		.prepare('SELECT id FROM podcasts WHERE name = ?')
		.get(podcast_name) as { id: number } | undefined;

	if (!podcast) {
		const result = db
			.prepare('INSERT INTO podcasts (name) VALUES (?)')
			.run(podcast_name);
		podcast = { id: Number(result.lastInsertRowid) };
		console.log(`Created podcast: ${podcast_name}`);
	}

	// Create episode
	const episode_result = db
		.prepare('INSERT INTO episodes (podcast_id, title) VALUES (?, ?)')
		.run(podcast.id, episode_title);
	const episode_id = Number(episode_result.lastInsertRowid);
	console.log(`Created episode: ${episode_title}`);

	// Insert segments and embeddings
	const insert_segment = db.prepare(
		'INSERT INTO segments (episode_id, text, start_time, end_time) VALUES (?, ?, ?, ?)',
	);

	const transaction = db.transaction(() => {
		for (let i = 0; i < segments.length; i++) {
			const seg = segments[i];
			const result = insert_segment.run(
				episode_id,
				seg.text,
				seg.start,
				seg.end,
			);
			const segment_id = Number(result.lastInsertRowid);
			const embedding_json = JSON.stringify(embeddings[i]);

			// sqlite-vec expects CAST for bound rowid and vec_f32() for JSON input
			db.prepare(
				`INSERT INTO segments_vec (rowid, embedding) VALUES (CAST(? AS INTEGER), vec_f32(?))`,
			).run(segment_id, embedding_json);
		}
	});

	transaction();
	console.log(`Inserted ${segments.length} segments with embeddings`);
}

// --- Search ---
function search(
	db: Database.Database,
	query_embedding: number[],
	limit = 10,
	podcast_ids?: number[],
) {
	const query_vec = JSON.stringify(query_embedding);

	// sqlite-vec requires k = ? for KNN queries
	let sql = `
    SELECT
      sv.rowid as segment_id,
      sv.distance,
      s.text,
      s.start_time,
      s.end_time,
      e.title as episode_title,
      p.name as podcast_name
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

	return db.prepare(sql).all(query_vec);
}

// --- CLI Commands ---
const commands: Record<string, () => Promise<void>> = {
	async init() {
		init_db();
	},

	async transcribe() {
		const { positionals, values } = parseArgs({
			args: process.argv.slice(3),
			options: {
				output: { type: 'string', short: 'o' },
			},
			allowPositionals: true,
		});

		const audio_path = positionals[0];
		if (!audio_path) {
			console.error(
				'Usage: cli transcribe <audio-file> [-o output.json]',
			);
			process.exit(1);
		}

		const result = await transcribe(audio_path);
		const output_path =
			values.output ||
			audio_path.replace(/\.[^.]+$/, '.transcript.json');

		writeFileSync(output_path, JSON.stringify(result, null, 2));
		console.log(`Transcript saved to ${output_path}`);

		const segments = parse_transcript(result);
		console.log(`Found ${segments.length} segments`);
	},

	async embed() {
		const { positionals, values } = parseArgs({
			args: process.argv.slice(3),
			options: {
				output: { type: 'string', short: 'o' },
			},
			allowPositionals: true,
		});

		const transcript_path = positionals[0];
		if (!transcript_path) {
			console.error(
				'Usage: cli embed <transcript.json> [-o embeddings.json]',
			);
			process.exit(1);
		}

		const transcript = JSON.parse(
			readFileSync(transcript_path, 'utf-8'),
		);
		const segments = parse_transcript(transcript);
		const texts = segments.map((s) => s.text);

		// Batch in groups of 100
		const batch_size = 100;
		const all_embeddings: number[][] = [];

		for (let i = 0; i < texts.length; i += batch_size) {
			const batch = texts.slice(i, i + batch_size);
			const embeddings = await embed(batch);
			all_embeddings.push(...embeddings);
			console.log(
				`Embedded ${Math.min(i + batch_size, texts.length)}/${texts.length}`,
			);
		}

		const output_path =
			values.output ||
			transcript_path.replace('.transcript.json', '.embeddings.json');
		writeFileSync(
			output_path,
			JSON.stringify(
				{ segments, embeddings: all_embeddings },
				null,
				2,
			),
		);
		console.log(`Embeddings saved to ${output_path}`);
	},

	async ingest() {
		const { positionals, values } = parseArgs({
			args: process.argv.slice(3),
			options: {
				podcast: { type: 'string', short: 'p' },
				episode: { type: 'string', short: 'e' },
			},
			allowPositionals: true,
		});

		const embeddings_path = positionals[0];
		if (!embeddings_path || !values.podcast || !values.episode) {
			console.error(
				'Usage: cli ingest <embeddings.json> -p "Podcast Name" -e "Episode Title"',
			);
			process.exit(1);
		}

		const data = JSON.parse(readFileSync(embeddings_path, 'utf-8'));
		const db = get_db();

		ingest(
			db,
			values.podcast,
			values.episode,
			data.segments,
			data.embeddings,
		);
		db.close();
	},

	async process() {
		const { positionals, values } = parseArgs({
			args: process.argv.slice(3),
			options: {
				podcast: { type: 'string', short: 'p' },
				episode: { type: 'string', short: 'e' },
			},
			allowPositionals: true,
		});

		const audio_path = positionals[0];
		if (!audio_path || !values.podcast || !values.episode) {
			console.error(
				'Usage: cli process <audio-file> -p "Podcast Name" -e "Episode Title"',
			);
			process.exit(1);
		}

		// 1. Transcribe
		console.log('\n--- Step 1: Transcribe ---');
		const transcript = await transcribe(audio_path);
		const segments = parse_transcript(transcript);
		console.log(`Got ${segments.length} segments`);

		// 2. Embed
		console.log('\n--- Step 2: Embed ---');
		const texts = segments.map((s) => s.text);
		const batch_size = 100;
		const all_embeddings: number[][] = [];

		for (let i = 0; i < texts.length; i += batch_size) {
			const batch = texts.slice(i, i + batch_size);
			const embeddings = await embed(batch);
			all_embeddings.push(...embeddings);
			console.log(
				`Embedded ${Math.min(i + batch_size, texts.length)}/${texts.length}`,
			);
		}

		// 3. Ingest
		console.log('\n--- Step 3: Ingest ---');
		const db = get_db();
		ingest(
			db,
			values.podcast,
			values.episode,
			segments,
			all_embeddings,
		);
		db.close();

		console.log('\nDone!');
	},

	async search() {
		const { positionals, values } = parseArgs({
			args: process.argv.slice(3),
			options: {
				limit: { type: 'string', short: 'n' },
				podcast: { type: 'string', short: 'p' },
			},
			allowPositionals: true,
		});

		const query = positionals.join(' ');
		if (!query) {
			console.error(
				'Usage: cli search "your query" [-n limit] [-p podcast]',
			);
			process.exit(1);
		}

		const db = get_db();
		const query_embedding = await embed_query(query);

		let podcast_ids: number[] | undefined;
		if (values.podcast) {
			const podcast = db
				.prepare('SELECT id FROM podcasts WHERE name LIKE ?')
				.get(`%${values.podcast}%`) as { id: number } | undefined;
			if (podcast) podcast_ids = [podcast.id];
		}

		const results = search(
			db,
			query_embedding,
			parseInt(values.limit || '10'),
			podcast_ids,
		);

		console.log(`\nResults for: "${query}"\n`);
		for (const r of results as any[]) {
			console.log(`[${r.podcast_name}] ${r.episode_title}`);
			console.log(
				`  Distance: ${r.distance.toFixed(4)} | Time: ${r.start_time.toFixed(1)}s - ${r.end_time.toFixed(1)}s`,
			);
			console.log(
				`  ${r.text.slice(0, 200)}${r.text.length > 200 ? '...' : ''}\n`,
			);
		}

		db.close();
	},

	async list() {
		const db = get_db();

		const podcasts = db
			.prepare('SELECT * FROM podcasts')
			.all() as any[];
		console.log('\nPodcasts:');
		for (const p of podcasts) {
			const count = db
				.prepare(
					'SELECT COUNT(*) as c FROM episodes WHERE podcast_id = ?',
				)
				.get(p.id) as { c: number };
			console.log(`  [${p.id}] ${p.name} (${count.c} episodes)`);
		}

		const episodes = db
			.prepare(
				`
      SELECT e.*, p.name as podcast_name,
             (SELECT COUNT(*) FROM segments WHERE episode_id = e.id) as segment_count
      FROM episodes e
      JOIN podcasts p ON e.podcast_id = p.id
    `,
			)
			.all() as any[];

		console.log('\nEpisodes:');
		for (const e of episodes) {
			console.log(
				`  [${e.id}] ${e.podcast_name} - ${e.title} (${e.segment_count} segments)`,
			);
		}

		db.close();
	},
};

// --- Main ---
const command = process.argv[2];

if (!command || !commands[command]) {
	console.log(`
AudioMind CLI

Usage: node --experimental-strip-types cli.ts <command> [options]

Commands:
  init                              Initialize database
  transcribe <audio> [-o out.json]  Transcribe audio file
  embed <transcript.json> [-o out]  Generate embeddings
  ingest <embeddings.json> -p -e    Insert into database
  process <audio> -p -e             Full pipeline (transcribe + embed + ingest)
  search "query" [-n limit] [-p]    Search segments
  list                              List podcasts and episodes

Examples:
  node cli.ts init
  node cli.ts process ./episode.mp3 -p "My Podcast" -e "Episode 1"
  node cli.ts search "machine learning" -n 5
  `);
	process.exit(1);
}

commands[command]().catch((err) => {
	console.error('Error:', err.message);
	process.exit(1);
});
