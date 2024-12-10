<script lang="ts">
	import type { ResponseStyle } from '$lib/stores/chat.svelte';

	let {
		search_query = $bindable(''),
		is_loading = $bindable(false),
		response_style = $bindable<ResponseStyle>('normal'),
		on_submit,
	} = $props<{
		search_query: string;
		is_loading: boolean;
		response_style: ResponseStyle;
		on_submit: (event: SubmitEvent) => void;
	}>();

	const response_styles: { value: ResponseStyle; label: string }[] = [
		{ value: 'normal', label: 'Normal' },
		{ value: 'concise', label: 'Concise' },
		{ value: 'explanatory', label: 'Explanatory' },
		{ value: 'formal', label: 'Formal' },
	];
</script>

<form class="mt-4" onsubmit={on_submit}>
	<div class="flex flex-col gap-2">
		<div class="join w-full">
			<input
				type="search"
				bind:value={search_query}
				class="input join-item input-bordered input-primary flex-1 text-xl"
				placeholder="Ask about the audio content..."
				disabled={is_loading}
			/>
			<button
				type="submit"
				class="btn btn-primary join-item"
				disabled={is_loading || !search_query.trim()}
			>
				{#if is_loading}
					<span class="loading loading-spinner"></span>
				{:else}
					Ask
				{/if}
			</button>
		</div>

		<div class="flex items-center justify-end gap-2 opacity-75">
			<label for="response-style" class="text-sm">
				Choose style:
			</label>
			<select
				id="response-style"
				class="select select-bordered select-sm max-w-[150px]"
				bind:value={response_style}
				disabled={is_loading}
			>
				{#each response_styles as style}
					<option value={style.value}>{style.label}</option>
				{/each}
			</select>
		</div>
	</div>
</form>
