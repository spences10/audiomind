// Shared by the app and the CLI, so no $app or #lib imports here
import { experimental_transcribe as transcribe } from 'ai';
import { openai_provider } from './openai.ts';

export type Provider = 'deepgram' | 'openai';

export interface Segment {
	text: string;
	start: number;
	end: number;
	speaker: number | null;
}

export interface Transcript {
	provider: Provider;
	model: string;
	duration: number | null;
	segments: Segment[];
}

export const DEEPGRAM_MODEL = 'nova-3';
// whisper-1 is the OpenAI model that returns timestamped segments
export const OPENAI_TRANSCRIBE_MODEL = 'whisper-1';
// OpenAI rejects uploads over 25 MB
const OPENAI_MAX_BYTES = 25 * 1024 * 1024;
// Whisper segments are a sentence or so; merge them to paragraph size
const MAX_CHUNK_CHARS = 1000;

export async function transcribe_audio(
	provider: Provider,
	audio: Uint8Array,
	content_type: string,
	api_key: string,
): Promise<Transcript> {
	return provider === 'deepgram'
		? transcribe_deepgram(audio, content_type, api_key)
		: transcribe_openai(audio, api_key);
}

async function transcribe_deepgram(
	audio: Uint8Array,
	content_type: string,
	api_key: string,
): Promise<Transcript> {
	if (!api_key) throw new Error('DEEPGRAM_API_KEY not set');

	const params = new URLSearchParams({
		model: DEEPGRAM_MODEL,
		smart_format: 'true',
		paragraphs: 'true',
		diarize: 'true',
	});
	const response = await fetch(
		`https://api.deepgram.com/v1/listen?${params}`,
		{
			method: 'POST',
			headers: {
				Authorization: `Token ${api_key}`,
				'Content-Type': content_type,
			},
			// Node Buffers type as ArrayBufferLike; fetch only wants ArrayBuffer
			body: audio as Uint8Array<ArrayBuffer>,
		},
	);

	if (!response.ok) {
		throw new Error(
			`Deepgram error: ${response.status} ${await response.text()}`,
		);
	}

	return parse_deepgram(await response.json());
}

interface DeepgramResponse {
	metadata?: { duration?: number };
	results?: {
		channels?: Array<{
			alternatives?: Array<{
				paragraphs?: {
					paragraphs?: Array<{
						sentences?: Array<{ text: string }>;
						speaker?: number;
						start?: number;
						end?: number;
					}>;
				};
			}>;
		}>;
	};
}

export function parse_deepgram(json: unknown): Transcript {
	const response = json as DeepgramResponse;
	const paragraphs =
		response.results?.channels?.[0]?.alternatives?.[0]?.paragraphs
			?.paragraphs;

	if (!paragraphs)
		throw new Error('No paragraphs in Deepgram response');

	return {
		provider: 'deepgram',
		model: DEEPGRAM_MODEL,
		duration: response.metadata?.duration ?? null,
		segments: paragraphs
			.map((p) => ({
				text: (p.sentences ?? [])
					.map((s) => s.text)
					.join(' ')
					.trim(),
				start: p.start ?? 0,
				end: p.end ?? 0,
				speaker: p.speaker ?? null,
			}))
			.filter((s) => s.text.length > 0),
	};
}

async function transcribe_openai(
	audio: Uint8Array,
	api_key: string,
): Promise<Transcript> {
	if (audio.byteLength > OPENAI_MAX_BYTES) {
		throw new Error(
			`OpenAI transcription accepts files up to 25 MB; this one is ${(audio.byteLength / 1024 / 1024).toFixed(1)} MB. Use --provider deepgram.`,
		);
	}

	const result = await transcribe({
		model: openai_provider(api_key).transcription(
			OPENAI_TRANSCRIBE_MODEL,
		),
		audio,
	});

	return {
		provider: 'openai',
		model: OPENAI_TRANSCRIBE_MODEL,
		duration: result.durationInSeconds ?? null,
		segments: merge_segments(
			result.segments.map((s) => ({
				text: s.text.trim(),
				start: s.startSecond,
				end: s.endSecond,
				speaker: null,
			})),
		),
	};
}

export function merge_segments(segments: Segment[]): Segment[] {
	const merged: Segment[] = [];
	for (const segment of segments) {
		if (!segment.text) continue;
		const last = merged.at(-1);
		if (
			last &&
			last.text.length + segment.text.length + 1 <= MAX_CHUNK_CHARS
		) {
			last.text = `${last.text} ${segment.text}`;
			last.end = segment.end;
		} else {
			merged.push({ ...segment });
		}
	}
	return merged;
}
