#!/usr/bin/env node

import { defineCommand, runMain } from 'citty';
import { parseFile } from 'music-metadata';
import { readFileSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { open_db } from '../lib/server/db.ts';
import {
	add_media,
	add_transcript,
	delete_media,
	list_media,
	rename_media,
	search_segments,
} from '../lib/server/library.ts';
import {
	EMBEDDING_MODEL,
	embed_query,
	embed_texts,
} from '../lib/server/openai.ts';
import {
	transcribe_audio,
	type Provider,
	type Transcript,
} from '../lib/server/transcribe.ts';

// Resolve paths relative to project root
const PROJECT_ROOT = resolve(import.meta.dirname, '../..');
const DB_PATH = resolve(
	PROJECT_ROOT,
	process.env.DATABASE_PATH || 'data/audiomind.db',
);
const SCHEMA_PATH = resolve(
	PROJECT_ROOT,
	'src/lib/server/schema.sql',
);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '';
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY ?? '';

const CONTENT_TYPES: Record<string, string> = {
	'.mp3': 'audio/mpeg',
	'.m4a': 'audio/mp4',
	'.mp4': 'audio/mp4',
	'.wav': 'audio/wav',
	'.ogg': 'audio/ogg',
	'.flac': 'audio/flac',
	'.webm': 'audio/webm',
};

function output(data: unknown): void {
	console.log(JSON.stringify(data, null, 2));
}

function with_db<T>(fn: (db: DatabaseSync) => T): T {
	const db = open_db(DB_PATH, readFileSync(SCHEMA_PATH, 'utf-8'));
	try {
		return fn(db);
	} finally {
		db.close();
	}
}

function parse_provider(value: string | undefined): Provider {
	if (!value || value === 'deepgram') return 'deepgram';
	if (value === 'openai') return 'openai';
	throw new Error(
		`Unknown provider "${value}"; use deepgram or openai`,
	);
}

function parse_id(value: string | undefined, name: string): number {
	const id = Number(value);
	if (!Number.isInteger(id) || id < 1) {
		throw new Error(`${name} must be a positive integer`);
	}
	return id;
}

async function get_audio_metadata(audio_path: string) {
	const { common, format } = await parseFile(audio_path);
	return {
		title: common.title,
		album: common.album,
		artist: common.artist,
		year: common.year,
		genre: common.genre,
		duration: format.duration,
	};
}

async function transcribe_file(
	audio_path: string,
	provider: Provider,
): Promise<Transcript> {
	const content_type =
		CONTENT_TYPES[extname(audio_path).toLowerCase()];
	if (!content_type) {
		throw new Error(
			`Unsupported audio type "${extname(audio_path)}"`,
		);
	}
	return transcribe_audio(
		provider,
		readFileSync(audio_path),
		content_type,
		provider === 'deepgram' ? DEEPGRAM_API_KEY : OPENAI_API_KEY,
	);
}

/** Embeds a transcript and saves it as a new media item, or onto an existing one. */
async function store(
	transcript: Transcript,
	media: { title: string; source_url?: string; media_id?: number },
) {
	const embeddings = await embed_texts(
		OPENAI_API_KEY,
		transcript.segments.map((s) => s.text),
	);

	return with_db((db) => {
		if (media.media_id) {
			const transcript_id = add_transcript(
				db,
				media.media_id,
				transcript,
				embeddings,
				EMBEDDING_MODEL,
			);
			return { media_id: media.media_id, transcript_id };
		}
		return add_media(
			db,
			{ title: media.title, source_url: media.source_url },
			transcript,
			embeddings,
			EMBEDDING_MODEL,
		);
	});
}

const provider_arg = {
	type: 'string',
	description: 'Transcription provider: deepgram (default) or openai',
	default: 'deepgram',
} as const;

const media_args = {
	title: {
		type: 'string',
		alias: 't',
		description: 'Title (defaults to the ID3 title)',
	},
	url: {
		type: 'string',
		alias: 'u',
		description: 'Source URL',
	},
	media: {
		type: 'string',
		alias: 'm',
		description:
			'Add the transcript to this existing media ID instead of creating one',
	},
} as const;

const init = defineCommand({
	meta: { name: 'init', description: 'Create the SQLite database' },
	run() {
		with_db(() => undefined);
		output({ ok: true, path: DB_PATH });
	},
});

const inspect = defineCommand({
	meta: {
		name: 'inspect',
		description: 'Show audio file metadata (ID3 tags)',
	},
	args: {
		audio: {
			type: 'positional',
			description: 'Path to the audio file',
			required: true,
		},
	},
	async run({ args }) {
		output({
			ok: true,
			metadata: await get_audio_metadata(args.audio),
		});
	},
});

const transcribe = defineCommand({
	meta: {
		name: 'transcribe',
		description: 'Transcribe an audio file without saving it',
	},
	args: {
		audio: {
			type: 'positional',
			description: 'Path to the audio file',
			required: true,
		},
		provider: provider_arg,
		output: {
			type: 'string',
			alias: 'o',
			description: 'Write the transcript JSON here (for ingest)',
		},
	},
	async run({ args }) {
		const transcript = await transcribe_file(
			args.audio,
			parse_provider(args.provider),
		);
		if (args.output) {
			writeFileSync(args.output, JSON.stringify(transcript, null, 2));
		}
		output({
			ok: true,
			provider: transcript.provider,
			segments: transcript.segments.length,
			output: args.output ?? null,
			...(args.output ? {} : { transcript }),
		});
	},
});

const ingest = defineCommand({
	meta: {
		name: 'ingest',
		description:
			'Embed and save a transcript JSON written by transcribe -o',
	},
	args: {
		transcript: {
			type: 'positional',
			description: 'Path to the transcript JSON',
			required: true,
		},
		...media_args,
	},
	async run({ args }) {
		const media_id = args.media
			? parse_id(args.media, '--media')
			: undefined;
		if (!media_id && !args.title) {
			throw new Error('--title is required unless --media is set');
		}
		const transcript = JSON.parse(
			readFileSync(args.transcript, 'utf-8'),
		) as Transcript;
		const ids = await store(transcript, {
			title: args.title ?? '',
			source_url: args.url,
			media_id,
		});
		output({
			ok: true,
			...ids,
			segments: transcript.segments.length,
		});
	},
});

const process_cmd = defineCommand({
	meta: {
		name: 'process',
		description: 'Transcribe, embed and save an audio file',
	},
	args: {
		audio: {
			type: 'positional',
			description: 'Path to the audio file',
			required: true,
		},
		provider: provider_arg,
		...media_args,
	},
	async run({ args }) {
		const media_id = args.media
			? parse_id(args.media, '--media')
			: undefined;
		const metadata = await get_audio_metadata(args.audio);
		const title = args.title || metadata.title;
		if (!media_id && !title) {
			throw new Error('No ID3 title found; pass --title or --media');
		}

		const transcript = await transcribe_file(
			args.audio,
			parse_provider(args.provider),
		);
		transcript.duration ??= metadata.duration ?? null;

		const ids = await store(transcript, {
			title: title ?? '',
			source_url: args.url,
			media_id,
		});
		output({
			ok: true,
			...ids,
			title,
			provider: transcript.provider,
			segments: transcript.segments.length,
		});
	},
});

const search = defineCommand({
	meta: {
		name: 'search',
		description: 'Search transcripts (vector + keyword)',
	},
	args: {
		query: {
			type: 'positional',
			description: 'Search text',
			required: true,
		},
		limit: {
			type: 'string',
			alias: 'n',
			description: 'Number of results (default: 10)',
			default: '10',
		},
	},
	async run({ args }) {
		const limit = parse_id(args.limit, '--limit');
		const embedding = await embed_query(OPENAI_API_KEY, args.query);
		const results = with_db((db) =>
			search_segments(db, embedding, args.query, limit),
		);
		output({ ok: true, query: args.query, results });
	},
});

const list = defineCommand({
	meta: {
		name: 'list',
		description: 'List media and their transcripts',
	},
	run() {
		output({ ok: true, media: with_db(list_media) });
	},
});

const rename = defineCommand({
	meta: { name: 'rename', description: 'Change a media title' },
	args: {
		id: {
			type: 'positional',
			description: 'Media ID',
			required: true,
		},
		title: {
			type: 'positional',
			description: 'New title',
			required: true,
		},
	},
	run({ args }) {
		const id = parse_id(args.id, 'id');
		const ok = with_db((db) => rename_media(db, id, args.title));
		output({ ok, id, title: args.title });
	},
});

const remove = defineCommand({
	meta: {
		name: 'delete',
		description: 'Delete a media item and its transcripts',
	},
	args: {
		id: {
			type: 'positional',
			description: 'Media ID',
			required: true,
		},
	},
	run({ args }) {
		const id = parse_id(args.id, 'id');
		output({ ok: with_db((db) => delete_media(db, id)), id });
	},
});

const main = defineCommand({
	meta: {
		name: 'audiomind',
		description: 'Transcribe audio and search it',
		version: '0.0.1',
	},
	subCommands: {
		init,
		inspect,
		transcribe,
		ingest,
		process: process_cmd,
		search,
		list,
		rename,
		delete: remove,
	},
});

void runMain(main);
