import { command, query } from '$app/server';
import { get_db } from '$lib/server/database';
import * as v from 'valibot';

export interface ChatSummary {
	id: string;
	title: string;
	created_at: string;
	updated_at: string;
}

export interface Chat extends ChatSummary {
	messages: unknown[];
}

interface ChatRow {
	id: string;
	title: string;
	messages: string;
	created_at: string;
	updated_at: string;
}

// Queries

export const get_chats = query(async (): Promise<ChatSummary[]> => {
	const db = get_db();
	return db
		.prepare(
			'SELECT id, title, created_at, updated_at FROM chats ORDER BY updated_at DESC',
		)
		.all() as ChatSummary[];
});

export const get_chat = query(
	v.object({ id: v.string() }),
	async ({ id }): Promise<Chat | null> => {
		const db = get_db();
		const chat = db
			.prepare('SELECT * FROM chats WHERE id = ?')
			.get(id) as ChatRow | undefined;

		if (!chat) return null;

		return {
			...chat,
			messages: JSON.parse(chat.messages),
		};
	},
);

// Commands

export const create_chat = command(
	v.object({
		id: v.string(),
		title: v.pipe(v.string(), v.minLength(1)),
		messages: v.array(v.any()),
	}),
	async ({ id, title, messages }) => {
		const db = get_db();
		db.prepare(
			'INSERT INTO chats (id, title, messages) VALUES (?, ?, ?)',
		).run(id, title, JSON.stringify(messages));

		return { id, title };
	},
);

export const update_chat = command(
	v.object({
		id: v.string(),
		title: v.optional(v.string()),
		messages: v.optional(v.array(v.any())),
	}),
	async ({ id, title, messages }) => {
		const db = get_db();

		if (title !== undefined) {
			db.prepare(
				'UPDATE chats SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
			).run(title, id);
		}

		if (messages !== undefined) {
			db.prepare(
				'UPDATE chats SET messages = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
			).run(JSON.stringify(messages), id);
		}

		return { success: true };
	},
);

export const delete_chat = command(
	v.object({ id: v.string() }),
	async ({ id }) => {
		const db = get_db();
		db.prepare('DELETE FROM chats WHERE id = ?').run(id);

		return { success: true };
	},
);
