export async function handle_stream_response(
	reader: ReadableStreamDefaultReader<Uint8Array>,
	callbacks: {
		on_search_results: (data: any) => void;
		on_claude_response: (data: string) => void;
	},
) {
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		const chunk = new TextDecoder().decode(value);
		const lines = chunk.split('\n');

		for (const line of lines) {
			if (!line.trim()) continue;
			try {
				const data = JSON.parse(line);
				if (data.type === 'results') {
					callbacks.on_search_results(data.data);
				} else if (data.type === 'claude_response') {
					callbacks.on_claude_response(data.data);
				}
			} catch (err) {
				console.error('Failed to parse event data:', err);
			}
		}
	}
}
