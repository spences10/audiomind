<script lang="ts">
	let audio_file: File;
	let episode_title = '';
	let search_query = '';
	let search_results: any[] = [];
	let claude_response = '';
	let processing = false;
	let searching = false;

	async function handle_upload() {
		if (!audio_file || !episode_title) return;

		processing = true;
		const form_data = new FormData();
		form_data.append('audio', audio_file);
		form_data.append('title', episode_title);

		try {
			const response = await fetch('/api/process-episode', {
				method: 'POST',
				body: form_data,
			});

			if (!response.ok) throw new Error('Upload failed');

			alert('Episode processed successfully!');
		} catch (error) {
			console.error('Upload error:', error);
			alert('Failed to process episode');
		} finally {
			processing = false;
		}
	}

	async function handle_search() {
		if (!search_query) return;

		searching = true;
		try {
			const response = await fetch('/api/search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: search_query }),
			});

			if (!response.ok) throw new Error('Search failed');

			const data = await response.json();
			search_results = data.results;
			claude_response = data.claude_response;
		} catch (error) {
			console.error('Search error:', error);
			alert('Search failed');
		} finally {
			searching = false;
		}
	}

	function handle_file_change(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target && target.files) {
			audio_file = target.files[0];
		}
	}
</script>

<div class="container mx-auto p-4">
	<h1 class="mb-4 text-2xl font-bold">Podcast Episode Processor</h1>

	<div class="mb-8 rounded border p-4">
		<h2 class="mb-4 text-xl">Upload Episode</h2>
		<div class="space-y-4">
			<div>
				<label class="mb-2 block">Episode Title</label>
				<input
					type="text"
					bind:value={episode_title}
					class="w-full rounded border p-2"
					placeholder="Enter episode title"
				/>
			</div>

			<div>
				<label class="mb-2 block">Audio File</label>
				<input
					type="file"
					accept="audio/*"
					on:change={handle_file_change}
					class="w-full"
				/>
			</div>

			<button
				on:click={handle_upload}
				disabled={processing}
				class="rounded bg-blue-500 px-4 py-2 text-white disabled:opacity-50"
			>
				{processing ? 'Processing...' : 'Process Episode'}
			</button>
		</div>
	</div>

	<div class="rounded border p-4">
		<h2 class="mb-4 text-xl">Search Episodes</h2>
		<div class="space-y-4">
			<div>
				<input
					type="text"
					bind:value={search_query}
					class="w-full rounded border p-2"
					placeholder="Enter search query"
				/>
			</div>

			<button
				on:click={handle_search}
				disabled={searching}
				class="rounded bg-green-500 px-4 py-2 text-white disabled:opacity-50"
			>
				{searching ? 'Searching...' : 'Search'}
			</button>

			{#if search_results.length > 0}
				<div class="mt-4 space-y-4">
					{#if claude_response}
						<div
							class="mb-6 rounded border border-blue-200 bg-blue-50 p-4"
						>
							<h3 class="mb-2 font-bold">Claude's Response:</h3>
							<div class="prose">{claude_response}</div>
						</div>
					{/if}

					<h3 class="mb-2 font-bold">Related Segments:</h3>
					{#each search_results as result}
						<div class="rounded border p-4">
							<div class="font-bold">{result.episode}</div>
							<div class="text-sm text-gray-600">
								Similarity: {(result.similarity * 100).toFixed(1)}%
							</div>
							<div class="mt-2">{result.text}</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
