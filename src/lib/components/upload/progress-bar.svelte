<script lang="ts">
	import { ErrorCircleIcon, SuccessCircleIcon } from '$lib/icons';
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
				<SuccessCircleIcon class_names="h-5 w-5 text-success" />
			{:else if upload_progress.stage === 'error'}
				<ErrorCircleIcon class_names="h-5 w-5 text-error" />
			{/if}
			<span class="text-sm font-medium"
				>{upload_progress.message}</span
			>
		</div>
		{#if upload_progress.is_processing}
			<span class="text-base-content/70 text-sm">
				{format_elapsed_time(upload_progress.start_time)}
			</span>
		{/if}
	</div>

	{#if upload_progress.current_operation}
		<p class="text-base-content/70 text-sm">
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
