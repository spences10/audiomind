import { VOYAGE_API_KEY } from '$env/static/private';

export async function generate_embedding(text: string) {
	const response = await fetch(
		'https://api.voyageai.com/v1/embeddings',
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${VOYAGE_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: 'voyage-01',
				input: text,
			}),
		},
	);

	if (!response.ok) {
		throw new Error(`Voyage AI API error: ${response.statusText}`);
	}

	const data = await response.json();
	return data.data[0].embedding;
}
