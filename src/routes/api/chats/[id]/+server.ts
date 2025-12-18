import { get_db } from '$lib/server/database';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface Chat {
	id: string;
	title: string;
	messages: string;
	created_at: string;
	updated_at: string;
}

// GET single chat
export const GET: RequestHandler = async ({ params }) => {
	const db = get_db();
	const chat = db
		.prepare('SELECT * FROM chats WHERE id = ?')
		.get(params.id) as Chat | undefined;

	if (!chat) {
		return new Response('Chat not found', { status: 404 });
	}

	return json({
		...chat,
		messages: JSON.parse(chat.messages),
	});
};

// PATCH update chat (title or messages)
export const PATCH: RequestHandler = async ({ params, request }) => {
	const updates = await request.json();
	const db = get_db();

	if (updates.title !== undefined) {
		db.prepare(
			'UPDATE chats SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
		).run(updates.title, params.id);
	}

	if (updates.messages !== undefined) {
		db.prepare(
			'UPDATE chats SET messages = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
		).run(JSON.stringify(updates.messages), params.id);
	}

	return json({ success: true });
};
