import {
	delete_chat,
	get_chats,
	type ChatSummary,
} from '$lib/chats.remote';
import { getContext, setContext } from 'svelte';

export type { ChatSummary };

const CONTEXT_KEY = 'chat-history';

export class ChatHistory {
	// Store the query reference so we can call .refresh() on it
	#query = get_chats();
	chats = $state<ChatSummary[]>([]);
	loading = $state(true);

	async fetch() {
		this.loading = true;
		try {
			// Initial fetch - await the query
			this.chats = await this.#query;
		} finally {
			this.loading = false;
		}
	}

	async refetch() {
		this.loading = true;
		try {
			// Call refresh() to bypass cache and get fresh data
			await this.#query.refresh();
			// After refresh, get the current value
			this.chats = this.#query.current ?? [];
		} finally {
			this.loading = false;
		}
	}

	async delete(id: string) {
		try {
			await delete_chat({ id });
			this.chats = this.chats.filter((c) => c.id !== id);
			return true;
		} catch {
			return false;
		}
	}

	static fromContext(): ChatHistory {
		return getContext<ChatHistory>(CONTEXT_KEY);
	}

	static setContext(history: ChatHistory) {
		setContext(CONTEXT_KEY, history);
	}
}
