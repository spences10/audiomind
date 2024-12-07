<script lang="ts">
	import type { ActionData } from './$types';

	const form = $props<{ form: ActionData }>();

	let audio_file = $state<File | undefined>(undefined);
	let episode_title = $state('');

	function handle_file_change(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target && target.files) {
			audio_file = target.files[0];
		}
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
				<form
					class="space-y-4"
					method="POST"
					action="?/upload"
					enctype="multipart/form-data"
				>
					{#if form.form?.error}
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
								/></svg
							>
							<span>{form.form.error}</span>
						</div>
					{/if}

					{#if form.form?.success && form.form?.message}
						<div class="alert alert-success shadow-lg" role="alert">
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
									d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
								/></svg
							>
							<span>{form.form.message}</span>
						</div>
					{/if}

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
							/>
							<label
								for="audio-file"
								class="btn btn-outline btn-primary flex-1 normal-case"
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

					<button type="submit" class="btn btn-primary w-full">
						Process Episode
					</button>
				</form>
			</div>
		</section>
	</div>
</main>
