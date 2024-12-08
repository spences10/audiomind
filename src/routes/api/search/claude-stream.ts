import { ANTHROPIC_API_KEY } from '$env/static/private';
import type { SearchResult } from './similarity';

export async function create_claude_stream(
	query: string,
	top_results: SearchResult[],
	response_style: 'normal' | 'concise' | 'explanatory' | 'formal' = 'normal'
): Promise<ReadableStream> {
	const style_instructions = {
		normal: "Respond in a balanced, straightforward manner.",
		concise: "Keep responses brief and to the point, focusing only on essential information.",
		explanatory: "Provide detailed explanations with examples and context where relevant.",
		formal: "Use professional language and maintain a scholarly tone."
	};

	return new ReadableStream({
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
								`You are a direct and factual assistant. Your role is to analyze the provided podcast excerpts and answer questions using ONLY the information contained within them. Do not add personal opinions, recommendations, or commentary beyond what is explicitly stated in the excerpts. If the information needed isn't in the excerpts, simply state that fact without elaboration. ${style_instructions[response_style]}`,
							messages: [
								{
									role: 'user',
									content: `Based solely on these podcast excerpts:

${top_results.map((segment) => `From episode "${segment.episode}": ${segment.text}`).join('\n\n')}

Question: ${query}

Provide a response using only information from these excerpts. If the information isn't in the excerpts, simply state that.`,
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
}
