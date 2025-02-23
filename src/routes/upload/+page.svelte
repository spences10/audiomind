<script lang="ts">
	import ProgressBar from '$lib/components/upload/progress-bar.svelte';
	import UploadForm from '$lib/components/upload/upload-form.svelte';
	import { upload_progress } from '$lib/stores/upload-progress.svelte';
</script>

<h1 class="text-primary mb-8 text-center text-4xl font-bold">
	Upload Episode
</h1>

<article
	class="card bg-base-100 shadow-xl"
	aria-labelledby="upload-title"
>
	<div class="card-body">
		<h2 id="upload-title" class="card-title text-secondary">
			Upload Episode
		</h2>

		<section aria-label="Upload Progress">
			{#if upload_progress.stage !== 'idle'}
				<ProgressBar />
			{/if}
		</section>

		<section aria-label="Upload Form">
			<UploadForm />
		</section>
	</div>
</article>
