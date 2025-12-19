<script lang="ts">
	import { cn } from '$lib/utils';
	import Markdown from 'svelte-exmarkdown';
	import { gfmPlugin } from 'svelte-exmarkdown/gfm';

	let { content }: { content: string } = $props();
</script>

<Markdown md={content} plugins={[gfmPlugin()]}>
	{#snippet ol(props)}
		{@const { children, ...rest } = props}
		<ol
			{...rest}
			class={cn('ml-4 list-outside list-decimal', rest.class)}
		>
			{@render children?.()}
		</ol>
	{/snippet}
	{#snippet ul(props)}
		{@const { children, ...rest } = props}
		<ul
			{...rest}
			class={cn('ml-4 list-outside list-disc', rest.class)}
		>
			{@render children?.()}
		</ul>
	{/snippet}
	{#snippet li(props)}
		{@const { children, ...rest } = props}
		<li {...rest} class={cn('py-1', rest.class)}>
			{@render children?.()}
		</li>
	{/snippet}
	{#snippet strong(props)}
		{@const { children, ...rest } = props}
		<span {...rest} class={cn('font-semibold', rest.class)}>
			{@render children?.()}
		</span>
	{/snippet}
	{#snippet a(props)}
		{@const { children, ...rest } = props}
		<a
			{...rest}
			class={cn('text-blue-500 hover:underline', rest.class)}
			target="_blank"
			rel="noopener noreferrer"
		>
			{@render children?.()}
		</a>
	{/snippet}
	{#snippet h1(props)}
		{@const { children, ...rest } = props}
		<h1
			{...rest}
			class={cn('mt-6 mb-2 text-2xl font-semibold', rest.class)}
		>
			{@render children?.()}
		</h1>
	{/snippet}
	{#snippet h2(props)}
		{@const { children, ...rest } = props}
		<h2
			{...rest}
			class={cn('mt-4 mb-2 text-xl font-semibold', rest.class)}
		>
			{@render children?.()}
		</h2>
	{/snippet}
	{#snippet h3(props)}
		{@const { children, ...rest } = props}
		<h3
			{...rest}
			class={cn('mt-4 mb-2 text-lg font-semibold', rest.class)}
		>
			{@render children?.()}
		</h3>
	{/snippet}
	{#snippet code(props)}
		{@const { children, ...rest } = props}
		{#if rest.class?.includes('language-')}
			<pre
				class="my-2 overflow-x-auto rounded-md bg-zinc-900 p-3 text-sm text-zinc-100"><code
					{...rest}>{@render children?.()}</code
				></pre>
		{:else}
			<code
				{...rest}
				class={cn(
					'rounded bg-muted px-1.5 py-0.5 font-mono text-sm',
					rest.class,
				)}>{@render children?.()}</code
			>
		{/if}
	{/snippet}
	{#snippet p(props)}
		{@const { children, ...rest } = props}
		<p {...rest} class={cn('mb-2 last:mb-0', rest.class)}>
			{@render children?.()}
		</p>
	{/snippet}
	{#snippet blockquote(props)}
		{@const { children, ...rest } = props}
		<blockquote
			{...rest}
			class={cn('border-l-4 border-muted pl-4 italic', rest.class)}
		>
			{@render children?.()}
		</blockquote>
	{/snippet}
</Markdown>
