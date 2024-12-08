import { shared_progress } from '$lib/server/shared-progress';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ setHeaders }) => {
	setHeaders({
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		Connection: 'keep-alive',
	});

	// Reset shared progress state at the start of each new connection
	shared_progress.reset();

	let controller: ReadableStreamDefaultController | null = null;
	let is_closed = false;
	const encoder = new TextEncoder();

	const cleanup = () => {
		if (!is_closed) {
			is_closed = true;
			shared_progress.reset();
			controller = null;
		}
	};

	const stream = new ReadableStream({
		start(c) {
			controller = c;

			const send_message = (data: any) => {
				if (is_closed || !controller) return;

				try {
					if (!controller.desiredSize) {
						cleanup();
						return;
					}
					controller.enqueue(
						encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
					);
				} catch (err) {
					console.error('Error sending message:', err);
					cleanup();
				}
			};

			// Subscribe to the shared progress store
			const unsubscribe = shared_progress.subscribe((state) => {
				if (state.stage === 'completed' || state.stage === 'error') {
					if (!is_closed) {
						send_message(state);
						// Give a small delay to ensure the final message is sent
						setTimeout(() => {
							if (!is_closed) {
								cleanup();
								if (controller) {
									try {
										controller.close();
									} catch (err) {
										// Ignore close errors as the controller might already be closed
									}
								}
							}
						}, 1000);
					}
				} else {
					send_message(state);
				}
			});

			// Clean up on connection close
			return () => {
				unsubscribe();
				cleanup();
				if (controller) {
					try {
						controller.close();
					} catch (err) {
						// Ignore close errors as the controller might already be closed
					}
				}
			};
		},
		cancel() {
			if (!is_closed) {
				cleanup();
				controller = null; // Just clear the reference, don't try to close
			}
		},
	});

	return new Response(stream);
};
