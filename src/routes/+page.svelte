<script lang="ts">
	import { chat } from '$lib/stores/chat.svelte';
	import { marked } from 'marked';

	let search_query = $state('');

	const handle_submit = async (event: SubmitEvent) => {
		event.preventDefault();
		if (!search_query.trim()) return;

		chat.set_loading(true);
		chat.add_message('user', search_query);

		try {
			const response = await fetch('/api/search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: search_query }),
			});

			if (!response.ok) throw new Error('Search failed');

			const reader = response.body?.getReader();
			if (!reader) throw new Error('No reader available');

			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (!line.trim()) continue;

					try {
						const data = JSON.parse(line);
						if (data.type === 'results') {
							chat.set_search_results(data.data);
						} else if (data.type === 'claude_response') {
							chat.append_to_current_response(data.data);
						}
					} catch (e) {
						console.error('Failed to parse line:', line, e);
					}
				}
			}

			chat.finalize_response();
			search_query = '';
		} catch (error) {
			console.error('Search error:', error);
			chat.add_message(
				'assistant',
				'Sorry, something went wrong. Please try again.',
			);
		} finally {
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
							<div
								class="chat-bubble {message.role === 'user'
									? 'chat-bubble-primary'
									: 'chat-bubble-accent'}"
							>
								{#if message.role === 'assistant'}
									{@html marked(message.content)}
								{:else}
									{message.content}
								{/if}
							</div>
						</div>
					{/each}

					{#if chat.current_response}
						<div class="chat chat-start">
							<div class="chat-header mb-1 opacity-75">
								Grumpy SEO Guy
							</div>
							<div class="chat-bubble chat-bubble-accent">
								{@html marked(chat.current_response)}
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
												{result.similarity}% match
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
