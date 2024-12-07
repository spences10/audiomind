import { init_database } from '$lib/server/database';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	try {
		await init_database();
	} catch (error) {
		console.error('Failed to initialize database:', error);
	}

	return resolve(event);
};
