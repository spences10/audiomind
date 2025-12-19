import { get_db } from '$lib/server/database';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export interface Chat {
	id: string;
	title: string;
	messages: string;
	created_at: string;
	updated_at: string;
}

// GET all chats
export const GET: RequestHandler = async () => {
	const db = get_db();
	const chats = db
		.prepare(
			'SELECT id, title, created_at, updated_at FROM chats ORDER BY updated_at DESC',
		)
		.all() as Chat[];

	return json(chats);
};

// POST create new chat
export const POST: RequestHandler = async ({ request }) => {
	const { id, title, messages } = await request.json();

	if (!id || !title) {
		return new Response('id and title required', { status: 400 });
	}

	const db = get_db();
	db.prepare(
		'INSERT INTO chats (id, title, messages) VALUES (?, ?, ?)',
	).run(id, title, JSON.stringify(messages || []));

	return json({ id, title });
};

// DELETE chat
export const DELETE: RequestHandler = async ({ request }) => {
	const { id } = await request.json();

	if (!id) {
		return new Response('id required', { status: 400 });
	}

	const db = get_db();
	db.prepare('DELETE FROM chats WHERE id = ?').run(id);

	return json({ success: true });
};
