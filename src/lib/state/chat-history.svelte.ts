import { getContext, setContext } from 'svelte';

export interface ChatSummary {
	id: string;
	title: string;
	created_at: string;
	updated_at: string;
}

const CONTEXT_KEY = 'chat-history';

export class ChatHistory {
	chats = $state<ChatSummary[]>([]);
	loading = $state(true);

	async fetch() {
		this.loading = true;
		try {
			const res = await fetch('/api/chats');
			if (res.ok) {
				this.chats = await res.json();
			}
		} finally {
			this.loading = false;
		}
	}

	async refetch() {
		await this.fetch();
	}

	async delete(id: string) {
		const res = await fetch('/api/chats', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id }),
		});

		if (res.ok) {
			this.chats = this.chats.filter((c) => c.id !== id);
		}

		return res.ok;
	}

	static fromContext(): ChatHistory {
		return getContext<ChatHistory>(CONTEXT_KEY);
	}

	static setContext(history: ChatHistory) {
		setContext(CONTEXT_KEY, history);
	}
}
