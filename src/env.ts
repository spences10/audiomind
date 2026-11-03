import { defineEnvVars } from '@sveltejs/kit/env';

// Read at runtime so builds and tests run without API keys
const optional = (input: string | undefined) => input ?? '';

export const variables = defineEnvVars({
	ANTHROPIC_API_KEY: { schema: optional },
	DEEPGRAM_API_KEY: { schema: optional },
	VOYAGE_API_KEY: { schema: optional },
});
