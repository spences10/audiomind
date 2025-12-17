import { VOYAGE_API_KEY } from '$env/static/private';

export async function generateEmbedding(text: string): Promise<number[]> {
	const response = await fetch('https://api.voyageai.com/v1/embeddings', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${VOYAGE_API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model: 'voyage-3-lite',
			input: text
		})
	});

	if (!response.ok) {
		throw new Error(`Voyage API error: ${response.statusText}`);
	}

	const data = await response.json();
	return data.data[0].embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
	const response = await fetch('https://api.voyageai.com/v1/embeddings', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${VOYAGE_API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model: 'voyage-3-lite',
			input: texts
		})
	});

	if (!response.ok) {
		throw new Error(`Voyage API error: ${response.statusText}`);
	}

	const data = await response.json();
	return data.data.map((d: { embedding: number[] }) => d.embedding);
}
