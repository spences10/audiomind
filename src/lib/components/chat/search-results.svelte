<script lang="ts">
	type SearchResult = {
		episode: string;
		similarity: number;
		text: string;
	};

	let props = $props<{
		results: SearchResult[];
	}>();

	let results = $derived(props.results);
</script>

{#if results.length > 0}
	<div class="collapse collapse-arrow mt-4 prose prose-sm">
		<input type="checkbox" />
		<div class="collapse-title text-xl font-medium">
			Search Results
		</div>
		<div class="collapse-content">
			<div class="space-y-4">
				{#each results as result}
					<div class="card bg-base-200 shadow-sm">
						<div class="card-body py-4">
							<h3 class="card-title text-sm text-primary">
								{result.episode}
							</h3>
							<div class="badge badge-accent badge-sm">
								{result.similarity.toFixed(1)}% match
							</div>
							<p class="mt-2 text-sm">{result.text}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}
