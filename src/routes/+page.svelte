<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Chat } from '@ai-sdk/svelte';
	import { ArrowUp } from '@lucide/svelte';

	const chat = new Chat({});

	let input_value = $state('');

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

	async function submit_message() {
		if (!input_value.trim() || loading) return;
		const text = input_value;
		input_value = '';
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
		<h1 class="text-xl font-semibold">AudioMind</h1>
		<p class="text-sm text-muted-foreground">
			Ask questions about your podcasts
		</p>
	</header>

	<main class="flex-1 overflow-y-auto p-4">
		<div class="mx-auto max-w-3xl space-y-6">
			{#if chat.messages.length === 0}
				<div
					class="flex h-full items-center justify-center text-center text-muted-foreground"
				>
					<div>
						<p class="text-lg font-medium">No messages yet</p>
						<p class="text-sm">
							Ask a question about your podcasts to get started
						</p>
					</div>
				</div>
			{:else}
				{#each chat.messages as message (message.id)}
					<div
						class="flex gap-3 {message.role === 'user'
							? 'justify-end'
							: ''}"
					>
						<div
							class="max-w-[80%] rounded-lg px-4 py-2 {message.role ===
							'user'
								? 'bg-primary text-primary-foreground'
								: 'bg-muted'}"
						>
							<p class="whitespace-pre-wrap">
								{get_message_text(message)}
							</p>
						</div>
					</div>
				{/each}
				{#if loading}
					<div class="flex gap-3">
						<div class="max-w-[80%] rounded-lg bg-muted px-4 py-2">
							<span class="animate-pulse">...</span>
						</div>
					</div>
				{/if}
			{/if}
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
