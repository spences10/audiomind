<script lang="ts">
	import { ListIcon } from '$lib/icons';

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
	<div class="dropdown dropdown-top">
		<button
			tabindex="0"
			class="btn btn-ghost btn-sm"
			title="View Search Results"
		>
			<ListIcon class_names="h-5 w-5" />
			<div
				class="badge badge-primary badge-sm absolute -right-1 -top-1"
			>
				{results.length}
			</div>
		</button>
		<div
			tabindex="0"
			class="card dropdown-content card-compact z-50 w-96 bg-base-200 shadow-xl"
		>
			<div class="card-body max-h-96 overflow-y-auto">
				<h3 class="card-title text-lg">Sources</h3>
				<div class="space-y-3">
					{#each results as result}
						<div class="rounded-lg bg-base-100 p-3">
							<div class="flex items-center justify-between">
								<h4 class="font-medium text-primary">
									{result.episode}
								</h4>
								<div class="badge badge-accent badge-sm">
									{result.similarity.toFixed(1)}% match
								</div>
							</div>
							<p class="mt-2 text-sm opacity-80">
								{result.text}
							</p>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}
