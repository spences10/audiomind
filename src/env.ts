import { defineEnvVars } from '@sveltejs/kit/env';

// Read at runtime so builds and tests run without API keys
const optional = (input: string | undefined) => input ?? '';

export const variables = defineEnvVars({
	OPENAI_API_KEY: {
		schema: optional,
		description: 'Chat answers and embeddings',
	},
	DEEPGRAM_API_KEY: {
		schema: optional,
		description: 'Transcription (default provider)',
	},
	DATABASE_PATH: {
		schema: (input) => input || 'data/audiomind.db',
		description: 'SQLite file; the CLI uses the same default',
	},
});
