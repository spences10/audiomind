<script lang="ts">
	import Markdown from '$lib/components/chat/markdown.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Chat } from '@ai-sdk/svelte';
	import { ArrowUp, Sparkles } from '@lucide/svelte';
	import { fly } from 'svelte/transition';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const chat = $derived.by(() => new Chat({
		id: data.chat.id,
		messages: data.chat.messages,
		onFinish: async () => {
			// Save updated messages to DB
			await fetch(`/api/chats/${data.chat.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messages: chat.messages }),
			});
		},
	}));

	let input_value = $state('');
	let container_ref = $state<HTMLElement | null>(null);
	let end_ref = $state<HTMLElement | null>(null);
	let scroll_locked = $state(false);

	function get_message_text(
		message: (typeof chat.messages)[0],
	): string {
		return (
			message.parts
				?.filter(
					(p): p is { type: 'text'; text: string } =>
						p.type === 'text',
				)
				.map((p) => p.text)
				.join('') ?? ''
		);
	}

	const loading = $derived(
		chat.status === 'streaming' || chat.status === 'submitted',
	);

	// Auto-scroll effect
	$effect(() => {
		if (!(container_ref && end_ref)) return;

		const observer = new MutationObserver(() => {
			if (!end_ref || scroll_locked) return;
			end_ref.scrollIntoView({ behavior: 'instant', block: 'end' });
		});

		observer.observe(container_ref, {
			childList: true,
			subtree: true,
			characterData: true,
		});

		return () => observer.disconnect();
	});

	function handle_scroll(e: Event) {
		const el = e.target as HTMLElement;
		const at_bottom =
			el.scrollHeight - el.scrollTop - el.clientHeight < 100;
		scroll_locked = !at_bottom;
	}

	async function submit_message() {
		if (!input_value.trim() || loading) return;
		const text = input_value;
		input_value = '';
		scroll_locked = false;
		await chat.sendMessage({ text });
	}

	function handle_key_down(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			submit_message();
		}
	}
</script>

<div class="flex h-screen flex-col bg-background">
	<header class="border-b p-4">
		<h1 class="text-xl font-semibold">{data.chat.title}</h1>
		<p class="text-sm text-muted-foreground">
			Ask questions about your podcasts
		</p>
	</header>

	<main
		bind:this={container_ref}
		onscroll={handle_scroll}
		class="flex-1 overflow-y-auto p-4"
	>
		<div class="mx-auto max-w-3xl space-y-6">
			{#each chat.messages as message (message.id)}
				<div
					in:fly={{ y: 10, duration: 200 }}
					class="flex gap-3 {message.role === 'user'
						? 'justify-end'
						: ''}"
				>
					{#if message.role === 'assistant'}
						<div
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted ring-1 ring-border"
						>
							<Sparkles class="h-4 w-4" />
						</div>
					{/if}
					<div
						class="max-w-[80%] rounded-2xl px-4 py-2 {message.role ===
						'user'
							? 'bg-primary text-primary-foreground'
							: 'bg-muted'}"
					>
						{#if message.role === 'assistant'}
							<Markdown content={get_message_text(message)} />
						{:else}
							<p class="whitespace-pre-wrap">
								{get_message_text(message)}
							</p>
						{/if}
					</div>
				</div>
			{/each}
			{#if loading && chat.messages.length > 0 && chat.messages[chat.messages.length - 1].role === 'user'}
				<div in:fly={{ y: 10, duration: 200 }} class="flex gap-3">
					<div
						class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted ring-1 ring-border"
					>
						<Sparkles class="h-4 w-4" />
					</div>
					<div class="text-muted-foreground">
						<span class="animate-pulse">Thinking...</span>
					</div>
				</div>
			{/if}
			<div bind:this={end_ref} class="h-4"></div>
		</div>
	</main>

	<footer class="border-t p-4">
		<div class="mx-auto max-w-3xl">
			<div class="flex gap-2">
				<Textarea
					bind:value={input_value}
					placeholder="Ask about your podcasts..."
					class="min-h-11 flex-1 resize-none"
					onkeydown={handle_key_down}
					rows={1}
				/>
				<Button
					type="button"
					size="icon"
					class="h-11 w-11 shrink-0"
					disabled={!input_value.trim() || loading}
					onclick={submit_message}
				>
					<ArrowUp class="h-4 w-4" />
				</Button>
			</div>
		</div>
	</footer>
</div>
