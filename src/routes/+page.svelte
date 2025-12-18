<script lang="ts">
	import {
		Message,
		MessageContent,
	} from '$lib/components/ai-elements/message';
	import {
		PromptInput,
		PromptInputSubmit,
		PromptInputTextarea,
		PromptInputToolbar,
	} from '$lib/components/ai-elements/prompt-input';
	import { Response } from '$lib/components/ai-elements/response';
	import { Chat } from '@ai-sdk/svelte';

	const chat = new Chat({});

	let input = $state('');

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

	async function handle_submit() {
		if (!input.trim()) return;
		const text = input;
		input = '';
		await chat.sendMessage({ text });
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
		<div class="mx-auto max-w-3xl space-y-4">
			{#each chat.messages as message (message.id)}
				<Message from={message.role}>
					{#if message.role === 'user'}
						<MessageContent
							>{get_message_text(message)}</MessageContent
						>
					{:else}
						<Response content={get_message_text(message)} />
					{/if}
				</Message>
			{/each}
		</div>
	</main>

	<footer class="border-t p-4">
		<div class="mx-auto max-w-3xl">
			<PromptInput
				onSubmit={async () => {
					await handle_submit();
				}}
			>
				<PromptInputTextarea
					placeholder="Ask about your podcasts..."
					bind:value={input}
				/>
				<PromptInputToolbar>
					<PromptInputSubmit
						disabled={chat.status === 'streaming' || !input.trim()}
					/>
				</PromptInputToolbar>
			</PromptInput>
		</div>
	</footer>
</div>
