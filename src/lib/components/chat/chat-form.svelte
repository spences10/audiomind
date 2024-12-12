<script lang="ts">
	import { config } from '$lib/config/app-config';
	import { CheckIcon, SendIcon, SettingsIcon } from '$lib/icons';
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

	const response_styles = Object.entries(
		config.ai.style_instructions,
	).map(([value, { description }]) => ({
		value: value as ResponseStyle,
		label: value.charAt(0).toUpperCase() + value.slice(1),
		description,
	}));
</script>

<form class="flex items-center gap-2" onsubmit={on_submit}>
	<div class="join flex-1">
		<input
			type="search"
			bind:value={search_query}
			class="input join-item input-bordered flex-1 bg-base-100 text-lg placeholder:text-base-content/50 focus:outline-none"
			placeholder="Ask about the audio content..."
			disabled={is_loading}
		/>
		<button
			type="submit"
			class="btn join-item bg-base-100 hover:bg-base-200"
			disabled={is_loading || !search_query.trim()}
		>
			{#if is_loading}
				<span class="loading loading-spinner"></span>
			{:else}
				<SendIcon class_names="h-5 w-5" />
			{/if}
		</button>
	</div>

	<div class="dropdown dropdown-end dropdown-top">
		<button
			tabindex="0"
			class="btn btn-ghost btn-sm"
			title="Response Style"
			disabled={is_loading}
		>
			<SettingsIcon class_names="h-5 w-5" />
		</button>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<ul
			tabindex="0"
			class="menu dropdown-content z-50 w-52 rounded-box bg-base-200 p-2 shadow-xl"
		>
			{#each response_styles as style}
				<li>
					<button
						class="flex items-center justify-between {response_style ===
						style.value
							? 'active'
							: ''}"
						onclick={() => (response_style = style.value)}
						title={style.description}
					>
						{style.label}
						{#if response_style === style.value}
							<CheckIcon class_names="h-4 w-4" />
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	</div>
</form>
