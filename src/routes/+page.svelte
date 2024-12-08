<script lang="ts">
	import type { ResponseStyle } from '$lib/stores/chat.svelte';
	import { chat } from '$lib/stores/chat.svelte';
	import { marked } from 'marked';

	let search_query = $state('');
	let event_source: EventSource | null = $state(null);

	const response_styles: { value: ResponseStyle; label: string }[] = [
		{ value: 'normal', label: 'Normal' },
		{ value: 'concise', label: 'Concise' },
		{ value: 'explanatory', label: 'Explanatory' },
		{ value: 'formal', label: 'Formal' },
	];

	// Cleanup effect for EventSource
	$effect(() => {
		return () => {
			if (event_source) {
				event_source.close();
				event_source = null;
			}
		};
	});

	const handle_submit = async (event: SubmitEvent) => {
		event.preventDefault();
		if (!search_query.trim()) return;

		// Reset state and add user message
		chat.set_loading(true);
		chat.add_message('user', search_query);

		try {
			// Close existing connection if any
			if (event_source) {
				event_source.close();
				event_source = null;
			}

			const response = await fetch('/api/search', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					query: search_query,
					response_style: chat.response_style,
				}),
			});

			if (!response.ok) {
				throw new Error('Search request failed');
			}

			const reader = response.body?.getReader();
			if (!reader) throw new Error('No reader available');

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = new TextDecoder().decode(value);
				const lines = chunk.split('\n');

				for (const line of lines) {
					if (!line.trim()) continue;
					try {
						const data = JSON.parse(line);
						if (data.type === 'results') {
							chat.set_search_results(data.data);
						} else if (data.type === 'claude_response') {
							chat.append_to_current_response(data.data);
						}
					} catch (err) {
						console.error('Failed to parse event data:', err);
					}
				}
			}

			search_query = '';
		} catch (error) {
			console.error('Search error:', error);
			chat.add_message(
				'assistant',
				'Sorry, something went wrong. Please try again.',
			);
		} finally {
			chat.finalize_response();
			chat.set_loading(false);
		}
	};
</script>

<main class="min-h-screen bg-base-200 p-4">
	<div class="container mx-auto max-w-4xl">
		<header>
			<h1 class="mb-8 text-center text-4xl font-bold text-primary">
				Grumpy SEO Guy Podcast Chat
			</h1>
		</header>

		<section class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<div class="mb-4 space-y-4">
					{#each chat.messages as message}
						<div
							class="chat {message.role === 'user'
								? 'chat-end'
								: 'chat-start'}"
						>
							<div class="chat-header mb-1 opacity-75">
								{message.role === 'user' ? 'You' : 'Grumpy SEO Guy'}
							</div>
							{#if message.role === 'assistant'}
								<div class="chat-bubble chat-bubble-accent">
									<div
										class="prose prose-headings:mb-2 prose-headings:mt-0 prose-p:my-1 prose-code:rounded prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:text-primary prose-code:before:content-none prose-code:after:content-none prose-pre:my-1 prose-pre:bg-base-300 prose-pre:p-2 prose-ul:my-1 prose-li:my-0"
									>
										{@html marked(message.content)}
									</div>
								</div>
							{:else}
								<div class="chat-bubble chat-bubble-primary">
									{message.content}
								</div>
							{/if}
						</div>
					{/each}

					{#if chat.current_response}
						<div class="chat chat-start">
							<div class="chat-header mb-1 opacity-75">
								Grumpy SEO Guy
							</div>
							<div class="chat-bubble chat-bubble-accent">
								<div
									class="prose prose-headings:mb-2 prose-headings:mt-0 prose-p:my-1 prose-code:rounded prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:text-primary prose-code:before:content-none prose-code:after:content-none prose-pre:my-1 prose-pre:bg-base-300 prose-pre:p-2 prose-ul:my-1 prose-li:my-0"
								>
									{@html marked(chat.current_response)}
								</div>
							</div>
						</div>
					{/if}

					{#if chat.is_loading && !chat.current_response}
						<div class="chat chat-start">
							<div class="chat-header mb-1 opacity-75">
								Grumpy SEO Guy
							</div>
							<div class="chat-bubble chat-bubble-accent">
								<span class="loading loading-dots loading-md"></span>
							</div>
						</div>
					{/if}
				</div>

				<form class="mt-4" onsubmit={handle_submit}>
					<div class="flex flex-col gap-2">
						<div class="join w-full">
							<input
								type="search"
								bind:value={search_query}
								class="input join-item input-bordered input-primary flex-1"
								placeholder="Ask about SEO..."
								disabled={chat.is_loading}
							/>
							<button
								type="submit"
								class="btn btn-primary join-item"
								disabled={chat.is_loading || !search_query.trim()}
							>
								{#if chat.is_loading}
									<span class="loading loading-spinner"></span>
								{:else}
									Ask
								{/if}
							</button>
						</div>

						<div
							class="flex items-center justify-end gap-2 opacity-75"
						>
							<label for="response-style" class="text-sm"
								>Choose style:</label
							>
							<select
								id="response-style"
								class="select select-bordered select-sm max-w-[150px]"
								bind:value={chat.response_style}
								disabled={chat.is_loading}
							>
								{#each response_styles as style}
									<option value={style.value}>{style.label}</option>
								{/each}
							</select>
						</div>
					</div>
				</form>

				{#if chat.search_results.length > 0}
					<div class="collapse collapse-arrow mt-4">
						<input type="checkbox" />
						<div class="collapse-title text-xl font-medium">
							Search Results
						</div>
						<div class="collapse-content">
							<div class="space-y-4">
								{#each chat.search_results as result}
									<div class="card bg-base-200 shadow-sm">
										<div class="card-body py-4">
											<h3 class="card-title text-sm text-primary">
												{result.episode}
											</h3>
											<div class="badge badge-accent badge-sm">
												{result.similarity.toFixed(1)}% match
											</div>
											<p class="mt-2 text-sm">{result.text}</p>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/if}
			</div>
		</section>
	</div>
</main>
