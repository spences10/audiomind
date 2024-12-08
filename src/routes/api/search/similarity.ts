import {
	cache_embedding,
	cache_search_results,
	get_cached_search_results,
} from '$lib/server/cache';
import { db } from '$lib/server/database';
import { generate_embedding } from '$lib/server/voyage';

export interface SearchResult {
	similarity: number;
	text: string;
	episode: string;
}

const BATCH_SIZE = 100;
const SIMILARITY_THRESHOLD = 0.6;
const MAX_RESULTS = 10;

export async function search_similar_segments(
	query: string,
): Promise<SearchResult[]> {
	// Check cache first
	const cached_results = get_cached_search_results(query);
	if (cached_results) {
		return cached_results;
	}

	// Generate query embedding (don't use cache to fix type issues)
	const query_embedding = await generate_embedding(query);
	cache_embedding(query, query_embedding);

	// Get total count of embeddings
	const count_result = await db.execute(
		'SELECT COUNT(*) as count FROM embeddings',
	);
	const total_count = Number((count_result.rows[0] as any)[0]);

	const all_similarities: SearchResult[] = [];

	// Process in batches
	for (let offset = 0; offset < total_count; offset += BATCH_SIZE) {
		const results = await db.execute(
			`SELECT e.id, e.embedding, t.segment_text, t.episode_title
            FROM embeddings e
            JOIN transcripts t ON e.transcript_id = t.id
            LIMIT ${BATCH_SIZE} OFFSET ${offset}`,
		);

		const batch_similarities = await Promise.all(
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

					const text = row[2] as string;
					const episode = row[3] as string;

					if (!text || !episode) {
						console.warn('Missing required text or episode data');
						return null;
					}

					const similarity = compute_cosine_similarity(
						query_embedding,
						stored_embedding,
					);

					// Only include if above threshold
					if (similarity >= SIMILARITY_THRESHOLD) {
						return {
							similarity,
							text,
							episode,
						};
					}
					return null;
				} catch (error) {
					console.error('Error parsing embedding:', error);
					return null;
				}
			}),
		);

		all_similarities.push(
			...batch_similarities.filter(
				(s): s is NonNullable<typeof s> => s !== null,
			),
		);

		// Early exit if we have enough high-quality matches
		if (all_similarities.length >= MAX_RESULTS * 2) {
			break;
		}
	}

	// Sort by similarity and take top results
	all_similarities.sort((a, b) => b.similarity - a.similarity);
	const top_results = all_similarities.slice(0, MAX_RESULTS);

	// Cache the results
	cache_search_results(query, top_results);

	return top_results;
}

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
