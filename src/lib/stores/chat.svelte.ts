type Message = { role: 'user' | 'assistant'; content: string };
type SearchResult = {
	episode: string;
	text: string;
	similarity: number;
};

export type ResponseStyle = 'normal' | 'concise' | 'explanatory' | 'formal';

export class ChatStore {
	messages = $state<Message[]>([]);
	current_response = $state('');
	is_loading = $state(false);
	search_results = $state<SearchResult[]>([]);
	response_style = $state<ResponseStyle>('normal');

	set_loading(value: boolean) {
		this.is_loading = value;
	}

	set_response_style(style: ResponseStyle) {
		this.response_style = style;
	}

	add_message(role: 'user' | 'assistant', content: string) {
		this.messages = [...this.messages, { role, content }];
	}

	append_to_current_response(text: string) {
		this.current_response += text;
	}

	finalize_response() {
		if (this.current_response) {
			this.messages = [
				...this.messages,
				{ role: 'assistant', content: this.current_response },
			];
			this.current_response = '';
		}
	}

	set_search_results(results: SearchResult[]) {
		this.search_results = results.map((result) => ({
			...result,
			similarity: parseFloat((result.similarity * 100).toFixed(1)),
		}));
	}
}

export const chat = new ChatStore();
