<script lang="ts">
	import { upload_progress } from '$lib/stores/upload-progress.svelte';

	let elapsed_seconds = $state(0);
	let timer_interval = $state<ReturnType<typeof setInterval> | null>(
		null,
	);

	$effect(() => {
		// Reset timer when stage changes to idle or completed
		if (
			upload_progress.stage === 'idle' ||
			upload_progress.stage === 'completed' ||
			upload_progress.stage === 'error'
		) {
			if (timer_interval) {
				clearInterval(timer_interval);
				timer_interval = null;
			}
		}
		// Start timer when entering a processing stage
		else if (!timer_interval && upload_progress.start_time) {
			elapsed_seconds = Math.floor(
				(Date.now() - upload_progress.start_time) / 1000,
			);
			timer_interval = setInterval(() => {
				elapsed_seconds = Math.floor(
					(Date.now() - upload_progress.start_time!) / 1000,
				);
			}, 1000);
		}

		// Cleanup on destroy
		return () => {
			if (timer_interval) {
				clearInterval(timer_interval);
				timer_interval = null;
			}
		};
	});
</script>

{#if upload_progress.stage !== 'idle'}
	<div class="mb-4 space-y-4">
		<div class="flex items-center gap-2">
			{#if upload_progress.stage === 'uploading'}
				<span class="loading loading-spinner loading-sm text-primary"
				></span>
				<span class="text-sm font-medium">Uploading file...</span>
				<span class="ml-auto text-sm text-base-content/70">
					{elapsed_seconds}s • {Math.round(upload_progress.progress)}%
				</span>
			{:else if upload_progress.stage === 'transcribing'}
				<span class="loading loading-spinner loading-sm text-primary"
				></span>
				<span class="text-sm font-medium">Transcribing audio...</span>
				<span class="ml-auto text-sm text-base-content/70">
					{elapsed_seconds}s • {Math.round(upload_progress.progress)}%
				</span>
			{:else if upload_progress.stage === 'processing_segments'}
				<span class="loading loading-spinner loading-sm text-primary"
				></span>
				<span class="text-sm font-medium">
					Processing segments ({upload_progress.current}/{upload_progress.total})
				</span>
				<span class="ml-auto text-sm text-base-content/70">
					{elapsed_seconds}s • {Math.round(upload_progress.progress)}%
				</span>
			{:else if upload_progress.stage === 'completed'}
				<span class="text-sm font-medium text-success"
					>Upload complete!</span
				>
				<span class="ml-auto text-sm text-base-content/70">
					Completed in {elapsed_seconds}s
				</span>
			{:else if upload_progress.stage === 'error'}
				<span class="text-sm font-medium text-error"
					>Error occurred</span
				>
			{/if}
		</div>

		<div class="flex items-center gap-2">
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
			<span class="min-w-[3rem] text-xs text-base-content/70"
				>{Math.round(upload_progress.progress)}%</span
			>
		</div>

		{#if upload_progress.message}
			<p
				class="text-sm {upload_progress.stage === 'error'
					? 'text-error'
					: 'text-base-content/70'}"
			>
				{upload_progress.message}
				{#if upload_progress.current_operation && upload_progress.stage !== 'error'}
					<br />
					<span class="text-xs opacity-70"
						>{upload_progress.current_operation}</span
					>
				{/if}
			</p>
		{/if}
	</div>
{/if}
