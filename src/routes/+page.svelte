<script lang="ts">
	import ChatForm from '$lib/components/chat/chat-form.svelte';
	import ChatMessage from '$lib/components/chat/chat-message.svelte';
	import SearchResults from '$lib/components/chat/search-results.svelte';
	import { config } from '$lib/config/app-config';
	import { chat } from '$lib/stores/chat.svelte';
	import { handle_stream_response } from '$lib/utils/chat/stream-handler';

	let search_query = $state('');
	let event_source: EventSource | null = $state(null);

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

			await handle_stream_response(reader, {
				on_search_results: (data) => chat.set_search_results(data),
				on_claude_response: (data) =>
					chat.append_to_current_response(data),
			});

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

<h1 class="mb-8 text-center text-4xl font-bold text-primary">
	{config.app_name}
</h1>

{#if config.app_description}
	<p class="mb-8 text-center text-lg text-base-content/80">
		{config.app_description}
	</p>
{/if}

<article class="card bg-base-100 shadow-xl">
	<div class="card-body">
		<section aria-label="Chat Messages" class="mb-4 space-y-4">
			{#each chat.messages as message}
				<ChatMessage role={message.role} content={message.content} />
			{/each}

			{#if chat.current_response}
				<ChatMessage
					role="assistant"
					content={chat.current_response}
				/>
			{/if}

			{#if chat.is_loading && !chat.current_response}
				<ChatMessage role="assistant" content="" is_loading={true} />
			{/if}
		</section>

		<section aria-label="Chat Input">
			<ChatForm
				bind:search_query
				is_loading={chat.is_loading}
				response_style={chat.response_style}
				on_submit={handle_submit}
			/>
		</section>

		<section aria-label="Search Results">
			<SearchResults results={chat.search_results} />
		</section>
	</div>
</article>
