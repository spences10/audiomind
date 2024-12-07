import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions = {
	search: async ({ request, fetch }) => {
		try {
			const data = await request.formData();
			const query = data.get('query');

			if (!query || typeof query !== 'string') {
				return fail(400, { error: 'Search query is required' });
			}

			const response = await fetch('api/search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query }),
			});

			if (!response.ok) {
				return fail(response.status, { error: 'Search failed' });
			}

			const result = await response.json();

			return {
				success: true,
				results: result.results,
				claude_response: result.claude_response,
			};
		} catch (error) {
			console.error('Search error:', error);
			return fail(500, { error: 'Internal server error' });
		}
	},
} satisfies Actions;
