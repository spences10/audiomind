import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions = {
	upload: async ({ request, fetch }) => {
		try {
			const data = await request.formData();
			const audio = data.get('audio');
			const title = data.get('title');

			if (!audio || !(audio instanceof File)) {
				return fail(400, { error: 'Audio file is required' });
			}

			if (!title || typeof title !== 'string') {
				return fail(400, { error: 'Title is required' });
			}

			const response = await fetch('api/process-episode', {
				method: 'POST',
				body: data,
			});

			if (!response.ok) {
				return fail(response.status, { error: 'Upload failed' });
			}

			return {
				success: true,
				message: 'Episode processed successfully!',
			};
		} catch (error) {
			console.error('Upload error:', error);
			return fail(500, { error: 'Internal server error' });
		}
	},
} satisfies Actions;
