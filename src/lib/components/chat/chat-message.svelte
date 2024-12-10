<script lang="ts">
	import { marked } from 'marked';

	let props = $props<{
		role: 'user' | 'assistant';
		content: string;
		is_loading?: boolean;
	}>();

	let role = $derived(props.role);
	let content = $derived(props.content);
	let is_loading = $derived(props.is_loading ?? false);
</script>

<div class="chat {role === 'user' ? 'chat-end' : 'chat-start'} mb-4">
	<div class="chat-header mb-1 opacity-75">
		{role === 'user' ? 'You' : 'Grumpy SEO Guy'}
	</div>
	<div
		class="chat-bubble {role === 'user'
			? 'chat-bubble-primary'
			: 'chat-bubble-accent'}"
	>
		{#if is_loading && !content}
			<span class="loading loading-dots loading-md"></span>
		{:else if role === 'assistant'}
			<div class="prose prose-lg">
				{@html marked(content)}
			</div>
		{:else}
			{content}
		{/if}
	</div>
</div>
