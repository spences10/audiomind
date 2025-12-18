import { ANTHROPIC_API_KEY } from '$env/static/private';

export interface Message {
	role: 'user' | 'assistant';
	content: string;
}

export async function stream_chat(
	messages: Message[],
	context: string,
	system_prompt?: string,
): Promise<ReadableStream> {
	const system =
		system_prompt ||
		`You are a helpful assistant answering questions based on podcast transcripts.
Use the provided context to answer questions. Be direct and concise.
If the context doesn't contain relevant information, say so.`;

	const response = await fetch(
		'https://api.anthropic.com/v1/messages',
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': ANTHROPIC_API_KEY,
				'anthropic-version': '2023-06-01',
			},
			body: JSON.stringify({
				model: 'claude-haiku-4-5-20250514',
				max_tokens: 1024,
				system: `${system}\n\nContext:\n${context}`,
				messages,
				stream: true,
			}),
		},
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(`Anthropic error: ${JSON.stringify(error)}`);
	}

	return response.body!;
}
