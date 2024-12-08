import { ANTHROPIC_API_KEY } from '$env/static/private';
import { db } from '$lib/server/database';
import { generate_embedding } from '$lib/server/voyage';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { query } = await request.json();

		// Generate embedding for search query
		const query_embedding = await generate_embedding(query);

		// Fetch all embeddings and compute similarities
		const results = await db.execute(`
					SELECT e.id, e.embedding, t.segment_text, t.episode_title
					FROM embeddings e
					JOIN transcripts t ON e.transcript_id = t.id
        `);

		// Process results and compute similarities
		const similarities = await Promise.all(
			results.rows.map(async (row) => {
				if (!row[1]) return null;

				try {
					const stored_embedding_data = JSON.parse(row[1] as string);
					const stored_embedding = stored_embedding_data.vector;

					if (!Array.isArray(stored_embedding)) {
						console.warn(
							'Invalid embedding format:',
							stored_embedding,
						);
						return null;
					}

					const similarity = compute_cosine_similarity(
						query_embedding,
						stored_embedding,
					);

					return {
						similarity,
						text: row[2],
						episode: row[3],
					};
				} catch (error) {
					console.error('Error parsing embedding:', error);
					return null;
				}
			}),
		);

		// Filter out null results, apply similarity threshold, and sort
		const similarity_threshold = 0.6; // 60% similarity threshold
		const valid_similarities = similarities.filter(
			(s): s is NonNullable<typeof s> =>
				s !== null && s.similarity >= similarity_threshold,
		);

		valid_similarities.sort((a, b) => b.similarity - a.similarity);
		const top_results = valid_similarities.slice(0, 10);

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

		// Create a stream for the response
		const stream = new ReadableStream({
			async start(controller) {
				try {
					// Send search results first
					controller.enqueue(
						JSON.stringify({ type: 'results', data: top_results }) +
							'\n',
					);

					// Get Claude's response and stream it
					const response = await fetch(
						'https://api.anthropic.com/v1/messages',
						{
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								'x-api-key': ANTHROPIC_API_KEY,
								'anthropic-version': '2023-06-01',
								accept: 'text/event-stream',
							},
							body: JSON.stringify({
								model: 'claude-3-5-sonnet-20241022',
								max_tokens: 1024,
								system:
									"You are the Grumpy SEO Guy, an experienced SEO professional who speaks directly and doesn't waste time with fluff. You provide practical, actionable advice based on real experience.",
								messages: [
									{
										role: 'user',
										content: `Based on the following excerpts from a podcast about SEO:

${top_results.map((segment) => `From episode "${segment.episode}": ${segment.text}`).join('\n\n')}

Question: ${query}

Please provide a detailed response using only the information from these podcast excerpts. If the information needed isn't in the excerpts, please say so.`,
									},
								],
								stream: true,
							}),
						},
					);

					if (!response.ok) {
						const error_data = await response.json();
						throw new Error(
							`Anthropic API error: ${response.statusText}\n${JSON.stringify(error_data, null, 2)}`,
						);
					}

					const reader = response.body?.getReader();
					if (!reader) throw new Error('No reader available');

					while (true) {
						const { done, value } = await reader.read();
						if (done) break;

						const chunk = new TextDecoder().decode(value);
						const lines = chunk.split('\n');

						for (const line of lines) {
							if (!line.trim() || line === 'data: {}') continue;
							if (line.startsWith('data: ')) {
								try {
									const data = JSON.parse(line.slice(6));
									if (
										data.type === 'content_block_delta' &&
										data.delta?.text
									) {
										controller.enqueue(
											JSON.stringify({
												type: 'claude_response',
												data: data.delta.text,
											}) + '\n',
										);
									} else if (data.type === 'message_start') {
										console.log('Message started');
									} else if (data.type === 'content_block_start') {
										console.log('Content block started');
									} else if (
										data.type === 'message_delta' &&
										data.delta?.text
									) {
										controller.enqueue(
											JSON.stringify({
												type: 'claude_response',
												data: data.delta.text,
											}) + '\n',
										);
									}
								} catch (e) {
									console.error('Failed to parse line:', line, e);
								}
							}
						}
					}
				} catch (error) {
					console.error('Streaming error:', error);
					controller.error(error);
				} finally {
					controller.close();
				}
			},
		});

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

function compute_cosine_similarity(a: number[], b: number[]): number {
	const dot_product = a.reduce(
		(sum, value, i) => sum + value * b[i],
		0,
	);
	const magnitude_a = Math.sqrt(
		a.reduce((sum, value) => sum + value * value, 0),
	);
	const magnitude_b = Math.sqrt(
		b.reduce((sum, value) => sum + value * value, 0),
	);
	return dot_product / (magnitude_a * magnitude_b);
}
