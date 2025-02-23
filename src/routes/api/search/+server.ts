import type { ResponseStyle } from '$lib/stores/chat.svelte';
import type { RequestHandler } from './$types';
import { create_claude_stream } from './claude-stream';
import { search_similar_segments } from './similarity';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { query, response_style } = await request.json();

		const top_results = await search_similar_segments(query);

		if (top_results.length === 0) {
			return new Response(
				JSON.stringify({
					type: 'results',
					data: [],
					message:
						'No relevant results found. Try rephrasing your question.',
				}),
				{
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		const stream = await create_claude_stream(
			query,
			top_results,
			response_style as ResponseStyle,
		);

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
			},
		});
	} catch (error) {
		console.error('Search error:', error);
		return new Response(JSON.stringify({ error: 'Search failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
