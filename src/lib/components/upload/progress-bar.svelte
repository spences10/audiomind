<script lang="ts">
	import { upload_progress } from '$lib/stores/upload-progress.svelte';
	import { formatDuration, intervalToDuration } from 'date-fns';

	let current_time = $state(Date.now());

	// Format elapsed time in a human-readable way
	function format_elapsed_time(start_time: number | null): string {
		if (!start_time) return '';

		const duration = intervalToDuration({
			start: new Date(start_time),
			end: new Date(current_time),
		});

		return formatDuration(duration, {
			format: ['minutes', 'seconds'],
			zero: false,
			delimiter: ' and ',
		});
	}

	// Track time updates only when processing
	$effect(() => {
		let interval: NodeJS.Timeout | null = null;

		if (upload_progress.is_processing) {
			interval = setInterval(() => {
				current_time = Date.now();
			}, 1000);
		}

		return () => {
			if (interval) {
				clearInterval(interval);
				interval = null;
			}
		};
	});
</script>

<div class="mb-4 space-y-4">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			{#if upload_progress.is_processing}
				<span class="loading loading-spinner loading-sm text-primary"
				></span>
			{:else if upload_progress.stage === 'completed'}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5 text-success"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
						clip-rule="evenodd"
					/>
				</svg>
			{:else if upload_progress.stage === 'error'}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5 text-error"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
						clip-rule="evenodd"
					/>
				</svg>
			{/if}
			<span class="text-sm font-medium"
				>{upload_progress.message}</span
			>
		</div>
		{#if upload_progress.is_processing}
			<span class="text-sm text-base-content/70">
				{format_elapsed_time(upload_progress.start_time)}
			</span>
		{/if}
	</div>

	{#if upload_progress.current_operation}
		<p class="text-sm text-base-content/70">
			{upload_progress.current_operation}
			{#if upload_progress.total > 0}
				({upload_progress.current}/{upload_progress.total})
			{/if}
		</p>
	{/if}

	<div class="h-2.5 w-full rounded-full bg-gray-200">
		<div
			class="h-2.5 rounded-full transition-all duration-300 {upload_progress.stage ===
			'error'
				? 'bg-error'
				: upload_progress.stage === 'completed'
					? 'bg-success'
					: 'bg-primary'}"
			style="width: {upload_progress.progress}%"
		></div>
	</div>

	{#if upload_progress.error}
		<div class="alert alert-error text-sm">
			{upload_progress.error}
		</div>
	{/if}
</div>
