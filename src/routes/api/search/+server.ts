import { get_claude_response } from '$lib/server/anthropic';
import { db } from '$lib/server/database';
import { generate_embedding } from '$lib/server/voyage';
import { json } from '@sveltejs/kit';
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

				// Convert the stored buffer back to Float32Array
				const stored_embedding = new Float32Array(
					new Uint8Array(row[1] as unknown as number[]).buffer,
				);

				const similarity = compute_cosine_similarity(
					query_embedding,
					Array.from(stored_embedding),
				);

				return {
					similarity,
					text: row[2],
					episode: row[3],
				};
			}),
		);

		// Filter out null results and sort by similarity
		const valid_similarities = similarities.filter(
			(s): s is NonNullable<typeof s> => s !== null,
		);
		valid_similarities.sort((a, b) => b.similarity - a.similarity);
		const top_results = valid_similarities.slice(0, 5);

		// Get Claude's interpretation of the results
		const claude_response = await get_claude_response(
			query,
			top_results,
		);

		return json({
			results: top_results,
			claude_response,
		});
	} catch (error) {
		console.error('Search error:', error);
		return json({ error: 'Search failed' }, { status: 500 });
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
