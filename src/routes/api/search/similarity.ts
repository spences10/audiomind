import { db } from '$lib/server/database';
import { generate_embedding } from '$lib/server/voyage';

export interface SearchResult {
	similarity: number;
	text: string;
	episode: string;
}

export async function search_similar_segments(
	query: string,
): Promise<SearchResult[]> {
	const query_embedding = await generate_embedding(query);

	const results = await db.execute(`
        SELECT e.id, e.embedding, t.segment_text, t.episode_title
        FROM embeddings e
        JOIN transcripts t ON e.transcript_id = t.id
    `);

	const similarities = await Promise.all(
		results.rows.map(async (row) => {
			if (!row[1]) return null;

			try {
				const stored_embedding_data = JSON.parse(row[1] as string);
				const stored_embedding = stored_embedding_data.vector;

				if (!Array.isArray(stored_embedding)) {
					console.warn('Invalid embedding format:', stored_embedding);
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

				return {
					similarity,
					text,
					episode,
				};
			} catch (error) {
				console.error('Error parsing embedding:', error);
				return null;
			}
		}),
	);

	const similarity_threshold = 0.6;
	const valid_similarities = similarities.filter(
		(s): s is NonNullable<typeof s> =>
			s !== null && s.similarity >= similarity_threshold,
	);

	valid_similarities.sort((a, b) => b.similarity - a.similarity);
	return valid_similarities.slice(0, 10);
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
