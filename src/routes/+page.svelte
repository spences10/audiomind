<script lang="ts">
	import ChatForm from '$lib/components/chat/chat-form.svelte';
	import ChatMessage from '$lib/components/chat/chat-message.svelte';
	import SearchResults from '$lib/components/chat/search-results.svelte';
	import { config } from '$lib/config/app-config';
	import { chat } from '$lib/stores/chat.svelte';
	import { handle_stream_response } from '$lib/utils/chat/stream-handler';

	let search_query = $state('');
	let event_source: EventSource | null = $state(null);
	let has_messages = $derived(
		chat.messages.length > 0 || chat.current_response,
	);
	let messages_container = $state<HTMLDivElement | null>(null);

	// Auto scroll to bottom when messages change or during streaming
	$effect(() => {
		if (!messages_container) return;

		// Always scroll on new messages
		if (chat.messages.length) {
			requestAnimationFrame(() => {
				messages_container?.scrollTo({
					top: messages_container.scrollHeight,
					behavior: 'auto'
				});
			});
		}
	});

	// Handle streaming scroll
	$effect(() => {
		if (!messages_container || !chat.current_response) return;

		// During streaming, use smooth scroll
		requestAnimationFrame(() => {
			messages_container?.scrollTo({
				top: messages_container.scrollHeight,
				behavior: 'smooth'
			});
		});
	});

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

<div class="flex h-screen flex-col bg-base-100">
	{#if !has_messages}
		<!-- Initial centered view -->
		<div
			class="flex flex-1 flex-col items-center justify-center px-4"
		>
			<div class="mb-2 text-center">
				<h1 class="mb-4 text-5xl font-bold text-primary">
					{config.app_name}
				</h1>
				{#if config.app_description}
					<p class="text-xl text-base-content/80">
						{config.app_description}
					</p>
				{/if}
			</div>
			<div class="w-full max-w-3xl">
				<ChatForm
					bind:search_query
					is_loading={chat.is_loading}
					response_style={chat.response_style}
					on_submit={handle_submit}
				/>
			</div>
		</div>
	{:else}
		<!-- Chat view -->
		<div class="relative flex flex-1 justify-center bg-base-200/50">
			<div class="absolute inset-0 overflow-hidden">
				<div 
					bind:this={messages_container}
					class="h-full overflow-y-auto scroll-smooth"
				>
					<div class="mx-auto w-full max-w-3xl px-4">
						<div class="space-y-4 py-8 pb-32">
							{#each chat.messages as message}
								<ChatMessage
									role={message.role}
									content={message.content}
								/>
							{/each}

							{#if chat.current_response}
								<ChatMessage
									role="assistant"
									content={chat.current_response}
								/>
							{/if}

							{#if chat.is_loading && !chat.current_response}
								<ChatMessage
									role="assistant"
									content=""
									is_loading={true}
								/>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Fixed bottom bar -->
		<div class="border-t bg-base-100 shadow-lg">
			<div class="mx-auto w-full max-w-3xl p-4">
				<div class="flex items-start gap-4">
					<!-- Search Results -->
					<div class="flex-none">
						<SearchResults results={chat.search_results} />
					</div>

					<!-- Chat Form -->
					<div class="flex-1">
						<ChatForm
							bind:search_query
							is_loading={chat.is_loading}
							response_style={chat.response_style}
							on_submit={handle_submit}
						/>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
