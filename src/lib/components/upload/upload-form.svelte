<script lang="ts">
	import { enhance } from '$app/forms';
	import { ErrorIcon } from '$lib/icons';
	import { upload_progress } from '$lib/stores/upload-progress.svelte';
	import { sse_handler } from '$lib/utils/upload/sse_handler';

	let audio_file = $state<File | undefined>(undefined);
	let episode_title = $state('');
	let upload_error = $state('');
	const sse = new sse_handler();

	function handle_file_change(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target && target.files) {
			audio_file = target.files[0];
		}
	}

	function handle_submit({
		formData,
		cancel,
	}: {
		formData: FormData;
		cancel: () => void;
	}) {
		if (!audio_file || !episode_title) {
			upload_error = 'Please provide both a title and an audio file';
			cancel();
			return;
		}

		// Ensure the file is attached to the form data
		formData.append('audio', audio_file);
		formData.append('title', episode_title);

		upload_error = '';
		sse.setup_sse_connection();
		upload_progress.start_upload();

		return async ({
			update,
			result,
		}: {
			update: () => Promise<void>;
			result: { type: string; data?: { error?: string } };
		}) => {
			await update();

			if (result.type === 'failure') {
				const error = result.data?.error as string | undefined;
				upload_error = error || 'Upload failed';
				upload_progress.update_progress({
					stage: 'error',
					error: error || 'Upload failed',
				});
			}
		};
	}

	// Handle cleanup of EventSource when component is destroyed
	$effect(() => {
		return () => {
			sse.cleanup_sse();
		};
	});
</script>

{#if upload_error}
	<div class="alert alert-error shadow-lg" role="alert">
		<ErrorIcon class_names="h-6 w-6" />
		<span>{upload_error}</span>
	</div>
{/if}

<form
	method="POST"
	class="space-y-4"
	use:enhance={handle_submit}
	enctype="multipart/form-data"
>
	<div class="form-control w-full">
		<label for="episode-title" class="label">
			<span class="label-text font-medium">Episode Title</span>
		</label>
		<input
			type="text"
			id="episode-title"
			name="title"
			bind:value={episode_title}
			class="input input-bordered input-primary w-full"
			placeholder="Enter episode title"
			disabled={upload_progress.stage !== 'idle'}
		/>
	</div>

	<div class="form-control w-full">
		<label for="audio-file" class="label">
			<span class="label-text font-medium">Audio File</span>
		</label>
		<div class="flex">
			<input
				type="file"
				id="audio-file"
				name="audio"
				accept="audio/*"
				onchange={handle_file_change}
				class="hidden"
				disabled={upload_progress.stage !== 'idle'}
			/>
			<label
				for="audio-file"
				class="btn btn-outline btn-primary flex-1 normal-case {upload_progress.stage !==
				'idle'
					? 'btn-disabled'
					: ''}"
			>
				Choose File
			</label>
			<span
				class="text-base-content/70 ml-3 flex items-center"
				aria-live="polite"
			>
				{audio_file?.name || 'No file chosen'}
			</span>
		</div>
	</div>

	<button
		type="submit"
		class="btn btn-primary w-full"
		disabled={upload_progress.stage !== 'idle'}
	>
		Process Episode
	</button>
</form>
