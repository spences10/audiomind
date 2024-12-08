import { ANTHROPIC_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('query');
	const response_style =
		url.searchParams.get('response_style') || 'normal';

	if (!query) {
		return new Response('Query parameter is required', {
			status: 400,
		});
	}

	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();

			try {
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
							model: 'claude-3-opus-20240229',
							max_tokens: 4096,
							temperature: 0.7,
							messages: [
								{
									role: 'user',
									content: `Query: ${query}\nStyle: ${response_style}\n\nPlease respond in the specified style.`,
								},
							],
							stream: true,
						}),
					},
				);

				if (!response.ok) {
					throw new Error('API request failed');
				}

				const reader = response.body?.getReader();
				if (!reader) throw new Error('No reader available');

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					const chunk = new TextDecoder().decode(value);
					const lines = chunk.split('\n');

					for (const line of lines) {
						if (line.startsWith('data: ')) {
							const data = line.slice(6);
							if (data === '[DONE]') continue;

							try {
								const parsed = JSON.parse(data);
								const content = parsed.delta?.text || '';

								if (content) {
									controller.enqueue(
										encoder.encode(
											`data: ${JSON.stringify({
												type: 'claude_response',
												data: content,
											})}\n\n`,
										),
									);
								}
							} catch (e) {
								console.error('Failed to parse chunk:', e);
							}
						}
					}
				}
			} catch (error) {
				console.error('Stream error:', error);
				controller.enqueue(
					encoder.encode(
						`data: ${JSON.stringify({
							type: 'claude_response',
							data: 'Sorry, something went wrong. Please try again.',
						})}\n\n`,
					),
				);
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
};
