import { get_db } from '$lib/server/database';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

interface ChatRow {
	id: string;
	title: string;
	messages: string;
	created_at: string;
	updated_at: string;
}

export const load: PageServerLoad = async ({ params }) => {
	const db = get_db();
	const chat = db
		.prepare('SELECT * FROM chats WHERE id = ?')
		.get(params.id) as ChatRow | undefined;

	if (!chat) {
		throw error(404, 'Chat not found');
	}

	return {
		chat: {
			id: chat.id,
			title: chat.title,
			messages: JSON.parse(chat.messages),
			created_at: chat.created_at,
			updated_at: chat.updated_at,
		},
	};
};
