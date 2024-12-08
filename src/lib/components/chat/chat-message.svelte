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

<div class="chat {role === 'user' ? 'chat-end' : 'chat-start'}">
	<div class="chat-header mb-1 opacity-75">
		{role === 'user' ? 'You' : 'Grumpy SEO Guy'}
	</div>
	{#if role === 'assistant'}
		<div class="chat-bubble chat-bubble-accent">
			{#if is_loading && !content}
				<span class="loading loading-dots loading-md"></span>
			{:else}
				<div
					class="prose prose-headings:mb-2 prose-headings:mt-0 prose-p:my-1 prose-code:rounded prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:text-primary prose-code:before:content-none prose-code:after:content-none prose-pre:my-1 prose-pre:bg-base-300 prose-pre:p-2 prose-ul:my-1 prose-li:my-0"
				>
					{@html marked(content)}
				</div>
			{/if}
		</div>
	{:else}
		<div class="chat-bubble chat-bubble-primary">
			{content}
		</div>
	{/if}
</div>
