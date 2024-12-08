import { upload_progress } from '$lib/stores/upload-progress.svelte';

const MAX_RETRIES = 3;

export class sse_handler {
	private event_source: EventSource | null = null;
	private cleanup_timeout: NodeJS.Timeout | null = null;
	private retry_count = 0;

	cleanup_sse() {
		if (this.event_source) {
			// Remove all event listeners before closing
			this.event_source.onmessage = null;
			this.event_source.onerror = null;
			this.event_source.onopen = null;

			this.event_source.close();
			this.event_source = null;
		}

		if (this.cleanup_timeout) {
			clearTimeout(this.cleanup_timeout);
			this.cleanup_timeout = null;
		}
	}

	handle_completion() {
		// Clear any existing cleanup timeout
		if (this.cleanup_timeout) {
			clearTimeout(this.cleanup_timeout);
		}

		// Set a new cleanup timeout
		this.cleanup_timeout = setTimeout(() => {
			this.cleanup_sse();
			if (upload_progress.stage === 'completed') {
				upload_progress.reset();
			}
			this.cleanup_timeout = null;
		}, 1500);
	}

	private handle_sse_error(error: any) {
		console.error('SSE Error:', error);

		// Only attempt retry if we haven't exceeded max retries and
		// we're not in a completed or error state
		if (
			this.retry_count < MAX_RETRIES &&
			upload_progress.stage !== 'completed' &&
			upload_progress.stage !== 'error'
		) {
			this.retry_count++;
			console.log(
				`Retrying SSE connection (${this.retry_count}/${MAX_RETRIES})...`,
			);

			// Clean up the current connection
			this.cleanup_sse();

			// Attempt to reconnect after a delay with exponential backoff
			const retry_delay = Math.min(
				1000 * Math.pow(2, this.retry_count - 1),
				5000,
			);
			setTimeout(() => {
				if (
					upload_progress.stage !== 'completed' &&
					upload_progress.stage !== 'error'
				) {
					this.setup_sse_connection();
				}
			}, retry_delay);
		} else if (
			upload_progress.stage !== 'completed' &&
			upload_progress.stage !== 'error'
		) {
			this.cleanup_sse();
			upload_progress.update_progress({
				stage: 'error',
				message: 'Connection lost. Please try again.',
				progress: 0,
			});
		}
	}

	setup_sse_connection() {
		// Clean up any existing connection
		this.cleanup_sse();

		// Reset upload progress before starting new connection
		upload_progress.reset();
		this.retry_count = 0;

		try {
			// Set up new SSE connection
			this.event_source = new EventSource('/api/upload-progress');

			this.event_source.onopen = () => {
				this.retry_count = 0; // Reset retry count on successful connection
				console.log('SSE connection established');
			};

			this.event_source.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					// Update the client-side store with the server's progress
					upload_progress.update_progress({
						stage: data.stage,
						message: data.message,
						progress: data.progress,
						current: data.current,
						total: data.total,
						current_operation: data.current_operation,
					});

					// Handle completion states immediately after updating progress
					if (data.stage === 'completed' || data.stage === 'error') {
						this.handle_completion();
					}
				} catch (err) {
					console.error('Error parsing SSE message:', err);
					this.handle_sse_error(
						new Error('Failed to parse server message'),
					);
				}
			};

			this.event_source.onerror = (error) => {
				// Only handle error if we're not already in a completion state
				if (
					upload_progress.stage !== 'completed' &&
					upload_progress.stage !== 'error'
				) {
					this.handle_sse_error(error);
				}
			};
		} catch (err) {
			console.error('Error setting up SSE connection:', err);
			this.handle_sse_error(err);
		}
	}
}
