<script lang="ts">
	import { upload_progress } from '$lib/stores/upload-progress.svelte';
</script>

{#if $upload_progress.stage !== 'idle'}
	<div class="mb-4 space-y-4">
		<div class="flex items-center gap-2">
			{#if $upload_progress.stage === 'uploading'}
				<span class="loading loading-spinner loading-sm text-primary"
				></span>
				<span class="text-sm font-medium">Uploading file...</span>
			{:else if $upload_progress.stage === 'transcribing'}
				<span class="loading loading-spinner loading-sm text-primary"
				></span>
				<span class="text-sm font-medium">Transcribing audio...</span>
			{:else if $upload_progress.stage === 'processing_segments'}
				<span class="loading loading-spinner loading-sm text-primary"
				></span>
				<span class="text-sm font-medium">
					Processing segments ({$upload_progress.current_segment}/{$upload_progress.total_segments})
				</span>
			{:else if $upload_progress.stage === 'completed'}
				<span class="text-sm font-medium text-success"
					>Upload complete!</span
				>
			{:else if $upload_progress.stage === 'error'}
				<span class="text-sm font-medium text-error"
					>Error occurred</span
				>
			{/if}
		</div>

		<div class="h-2.5 w-full rounded-full bg-gray-200">
			<div
				class="h-2.5 rounded-full transition-all duration-300 {$upload_progress.stage ===
				'error'
					? 'bg-error'
					: $upload_progress.stage === 'completed'
						? 'bg-success'
						: 'bg-primary'}"
				style="width: {$upload_progress.progress}%"
			></div>
		</div>

		{#if $upload_progress.message}
			<p
				class="text-sm {$upload_progress.stage === 'error'
					? 'text-error'
					: 'text-base-content/70'}"
			>
				{$upload_progress.message}
			</p>
		{/if}
	</div>
{/if}
