import { ANTHROPIC_API_KEY } from '$env/static/private';
import { config } from '$lib/config/app-config';
import {
	cache_claude_response,
	generate_claude_cache_key,
	get_cached_claude_response,
} from '$lib/server/cache';
import type { SearchResult } from './similarity';

export async function create_claude_stream(
	query: string,
	top_results: SearchResult[],
	response_style:
		| 'normal'
		| 'concise'
		| 'explanatory'
		| 'formal' = config.default_response_style,
): Promise<ReadableStream> {
	return new ReadableStream({
		async start(controller) {
			try {
				// Send search results first
				controller.enqueue(
					JSON.stringify({ type: 'results', data: top_results }) +
						'\n',
				);

				// Generate cache key based on query and context
				const context_texts = top_results.map((r) => r.text);
				const cache_key = generate_claude_cache_key(
					query,
					context_texts,
				);

				// Check cache first
				const cached_response = get_cached_claude_response(cache_key);
				if (cached_response) {
					// Stream cached response in chunks to maintain streaming behavior
					const chunk_size = 20;
					for (
						let i = 0;
						i < cached_response.length;
						i += chunk_size
					) {
						const chunk = cached_response.slice(i, i + chunk_size);
						controller.enqueue(
							JSON.stringify({
								type: 'claude_response',
								data: chunk,
							}) + '\n',
						);
						// Small delay to simulate streaming
						await new Promise((resolve) => setTimeout(resolve, 10));
					}
					controller.close();
					return;
				}

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
							model: config.ai.model,
							max_tokens: config.ai.max_tokens,
							system: `${config.ai.system_prompt}

${config.ai.style_instructions[response_style].instruction}`,
							messages: [
								{
									role: 'user',
									content: `Here is the context:

${top_results.map((segment) => segment.text).join('\n\n')}

${query}`,
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

				let full_response = '';

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
									full_response += data.delta.text;
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
									full_response += data.delta.text;
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

				// Cache the complete response
				cache_claude_response(cache_key, full_response);
			} catch (error) {
				console.error('Streaming error:', error);
				controller.error(error);
			} finally {
				controller.close();
			}
		},
	});
}
