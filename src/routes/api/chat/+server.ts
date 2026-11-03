import { OPENAI_API_KEY } from '$app/env/private';
import { get_db } from '#lib/server/database.js';
import { search_segments } from '#lib/server/library.js';
import type { SearchResult } from '#lib/server/library.js';
import {
	CHAT_MODEL,
	embed_query,
	openai_provider,
} from '#lib/server/openai.js';
import { createUIMessageStreamResponse, streamText } from 'ai';
import type { RequestHandler } from './$types';

function build_context(results: SearchResult[]): string {
	if (results.length === 0) return 'No relevant context found.';

	return results
		.map(
			(r, i) =>
				`[${i + 1}] ${r.media_title} (${format_time(r.start_time)}):\n${r.text}`,
		)
		.join('\n\n');
}

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
	const query_embedding = await embed_query(
		OPENAI_API_KEY,
		user_text,
	);
	const search_results = search_segments(
		get_db(),
		query_embedding,
		user_text,
	);
	const context = build_context(search_results);

	const system_prompt = `You are a helpful assistant answering questions based on audio transcripts.
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
		title: r.media_title,
		filename: `${format_time(r.start_time)} - ${format_time(r.end_time)}`,
	}));

	const result = streamText({
		model: openai_provider(OPENAI_API_KEY)(CHAT_MODEL),
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
