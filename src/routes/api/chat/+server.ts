import {
	ANTHROPIC_API_KEY,
	VOYAGE_API_KEY,
} from '$env/static/private';
import { get_db } from '$lib/server/database';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createUIMessageStreamResponse, streamText } from 'ai';
import type { RequestHandler } from './$types';

interface SearchResult {
	segment_id: number;
	distance: number;
	text: string;
	start_time: number;
	end_time: number;
	episode_title: string;
	podcast_name: string;
}

async function embed_query(text: string): Promise<number[]> {
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

function search(
	query_embedding: number[],
	limit = 5,
): SearchResult[] {
	const db = get_db();
	const query_vec = JSON.stringify(query_embedding);

	const sql = `
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
		ORDER BY sv.distance
	`;

	return db.prepare(sql).all(query_vec) as SearchResult[];
}

function build_context(results: SearchResult[]): string {
	if (results.length === 0) return 'No relevant context found.';

	return results
		.map(
			(r, i) =>
				`[${i + 1}] ${r.podcast_name} - ${r.episode_title} (${r.start_time.toFixed(1)}s):\n${r.text}`,
		)
		.join('\n\n');
}

const anthropic = createAnthropic({ apiKey: ANTHROPIC_API_KEY });

export const POST: RequestHandler = async ({ request }) => {
	const { messages } = await request.json();

	if (
		!messages ||
		!Array.isArray(messages) ||
		messages.length === 0
	) {
		return new Response('Messages required', { status: 400 });
	}

	// Extract text from last user message
	const last_user_message = messages.findLast(
		(m: { role: string }) => m.role === 'user',
	);
	if (!last_user_message) {
		return new Response('No user message found', { status: 400 });
	}

	// Get text content from parts
	const user_text =
		last_user_message.parts
			?.filter((p: { type: string }) => p.type === 'text')
			.map((p: { text: string }) => p.text)
			.join(' ') ||
		last_user_message.content ||
		'';

	// Embed query and search
	const query_embedding = await embed_query(user_text);
	const search_results = search(query_embedding);
	const context = build_context(search_results);

	const system_prompt = `You are a helpful assistant answering questions based on podcast transcripts.
Use the provided context to answer questions. Be direct and concise.
If the context doesn't contain relevant information, say so.

Context:
${context}`;

	// Convert messages to AI SDK format, filtering out empty messages
	const core_messages = messages
		.map(
			(m: {
				role: string;
				parts?: { type: string; text: string }[];
				content?: string;
			}) => ({
				role: m.role as 'user' | 'assistant',
				content:
					m.parts
						?.filter((p) => p.type === 'text')
						.map((p) => p.text)
						.join(' ')
						.trim() ||
					m.content?.trim() ||
					'',
			}),
		)
		.filter((m) => m.content.length > 0);

	// Prepare sources for injection
	const sources = search_results.map((r, i) => ({
		type: 'source-document' as const,
		sourceId: `${i + 1}`,
		mediaType: 'text/plain',
		title: `${r.podcast_name} - ${r.episode_title}`,
		filename: `${format_time(r.start_time)} - ${format_time(r.end_time)}`,
	}));

	const result = streamText({
		model: anthropic('claude-haiku-4-5-20251001'),
		system: system_prompt,
		messages: core_messages,
	});

	// Get the base UI stream and transform it to inject sources before finish
	const baseStream = result.toUIMessageStream();

	const transformedStream = baseStream.pipeThrough(
		new TransformStream({
			transform(chunk, controller) {
				// If this is the finish chunk, inject sources before it
				if (chunk.type === 'finish') {
					for (const source of sources) {
						controller.enqueue(source);
					}
				}
				controller.enqueue(chunk);
			},
		}),
	);

	return createUIMessageStreamResponse({ stream: transformedStream });
};

function format_time(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, '0')}`;
}
