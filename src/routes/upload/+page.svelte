<script lang="ts">
	import { enhance } from '$app/forms';
	import { upload_progress } from '$lib/stores/upload-progress.svelte';
	import { onMount } from 'svelte';
	import type { ActionData } from './$types';

	const form = $props<{ form: ActionData }>();

	let audio_file = $state<File | undefined>(undefined);
	let episode_title = $state('');
	let upload_error = $state('');

	// Subscribe to the store
	$effect(() => {
		if (upload_progress.stage === 'completed') {
			setTimeout(() => {
				upload_progress.reset();
				audio_file = undefined;
				episode_title = '';
			}, 5000);
		}
	});

	onMount(() => {
		upload_progress.reset();

		// Set up SSE connection
		const events = new EventSource('/api/upload-progress');

		events.onmessage = (event) => {
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
		};

		events.onerror = (error) => {
			console.error('SSE Error:', error);
			upload_progress.update_progress({
				stage: 'error',
				message: 'Connection lost. Please try again.',
				progress: 0,
			});
			events.close();
		};

		return () => {
			events.close();
		};
	});

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
</script>

<main class="min-h-screen bg-base-200 p-4">
	<div class="container mx-auto max-w-4xl">
		<header>
			<h1 class="mb-8 text-center text-4xl font-bold text-primary">
				Upload Episode
			</h1>
		</header>

		<section
			class="card bg-base-100 shadow-xl"
			aria-labelledby="upload-title"
		>
			<div class="card-body">
				<h2 id="upload-title" class="card-title text-secondary">
					Upload Episode
				</h2>

				{#if upload_error}
					<div class="alert alert-error shadow-lg" role="alert">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-6 w-6"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
							></path></svg
						>
						<span>{upload_error}</span>
					</div>
				{/if}

				{#if upload_progress.stage !== 'idle'}
					<div class="mb-4 space-y-4">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								{#if upload_progress.is_processing}
									<span
										class="loading loading-spinner loading-sm text-primary"
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
									{upload_progress.elapsed_time}s
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
				{/if}

				<form
					method="POST"
					class="space-y-4"
					use:enhance={handle_submit}
					enctype="multipart/form-data"
				>
					<div class="form-control w-full">
						<label for="episode-title" class="label">
							<span class="label-text font-medium">Episode Title</span
							>
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
								class="ml-3 flex items-center text-base-content/70"
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
			</div>
		</section>
	</div>
</main>
