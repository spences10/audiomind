<script lang="ts">
	import ProgressBar from '$lib/components/upload/progress-bar.svelte';
	import UploadForm from '$lib/components/upload/upload-form.svelte';
	import { upload_progress } from '$lib/stores/upload-progress.svelte';
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

				{#if upload_progress.stage !== 'idle'}
					<ProgressBar />
				{/if}

				<UploadForm />
			</div>
		</section>
	</div>
</main>
