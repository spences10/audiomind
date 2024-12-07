import { ANTHROPIC_API_KEY } from '$env/static/private';

export async function get_claude_response(
	query: string,
	context_segments: any[],
) {
	// Format the context segments into a single string
	const context = context_segments
		.map(
			(segment) =>
				`From episode "${segment.episode}": ${segment.text}`,
		)
		.join('\n\n');

	const messages = [
		{
			role: 'user',
			content: `Based on the following excerpts from a podcast about SEO:

${context}

Question: ${query}

Please provide a detailed response using only the information from these podcast excerpts. If the information needed isn't in the excerpts, please say so.`,
		},
	];

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
				model: 'claude-3-sonnet-20240229',
				max_tokens: 1024,
				messages,
				temperature: 0,
			}),
		},
	);

	if (!response.ok) {
		throw new Error(`Anthropic API error: ${response.statusText}`);
	}

	const data = await response.json();
	return data.content[0].text;
}
