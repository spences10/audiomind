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
	let dropdown_button = $state<HTMLButtonElement>();
	let dropdown_content = $state<HTMLDivElement>();

	function handle_button_click() {
		if (dropdown_content) {
			dropdown_content.focus();
		}
	}

	function handle_blur(event: FocusEvent) {
		// Check if the new focus target is outside our dropdown
		const related_target = event.relatedTarget as HTMLElement;
		if (
			!dropdown_content?.contains(related_target) &&
			related_target !== dropdown_button
		) {
			dropdown_content?.blur();
		}
	}
</script>

{#if results.length > 0}
	<div class="dropdown dropdown-top">
		<button
			bind:this={dropdown_button}
			class="btn btn-ghost btn-sm"
			title="View Search Results"
			onclick={handle_button_click}
		>
			<ListIcon class_names="h-5 w-5" />
			<div
				class="badge badge-primary badge-sm absolute -top-1 -right-1"
			>
				{results.length}
			</div>
		</button>
		<div
			bind:this={dropdown_content}
			onblur={handle_blur}
			class="card dropdown-content card-compact bg-base-200 z-50 w-[70vw] max-w-2xl shadow-xl"
		>
			<div class="card-body max-h-96 overflow-y-auto">
				<h3 class="card-title text-lg">Sources</h3>
				<div class="space-y-3">
					{#each results as result}
						<div class="bg-base-100 rounded-lg p-3">
							<div class="flex flex-col gap-1">
								<h4 class="text-primary font-medium">
									{result.episode}
								</h4>
								<div class="badge badge-accent badge-sm w-fit">
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
