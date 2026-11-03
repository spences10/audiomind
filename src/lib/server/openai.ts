// Shared by the app and the CLI, so no $app or #lib imports here
import { createOpenAI } from '@ai-sdk/openai';
import { embed, embedMany } from 'ai';

export const CHAT_MODEL = 'gpt-5.4-mini';
// Must match the float[1536] column in schema.sql
export const EMBEDDING_MODEL = 'text-embedding-3-small';

export function openai_provider(api_key: string) {
	if (!api_key) throw new Error('OPENAI_API_KEY not set');
	return createOpenAI({ apiKey: api_key });
}

export async function embed_texts(
	api_key: string,
	texts: string[],
): Promise<number[][]> {
	const { embeddings } = await embedMany({
		model: openai_provider(api_key).embedding(EMBEDDING_MODEL),
		values: texts,
	});
	return embeddings;
}

export async function embed_query(
	api_key: string,
	text: string,
): Promise<number[]> {
	const { embedding } = await embed({
		model: openai_provider(api_key).embedding(EMBEDDING_MODEL),
		value: text,
	});
	return embedding;
}
