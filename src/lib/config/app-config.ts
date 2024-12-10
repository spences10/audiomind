export interface StyleInstruction {
	description: string;
	instruction: string;
}

export interface AppConfig {
	// Application
	app_name: string;
	app_description: string;

	// AI Configuration
	ai: {
		model: string;
		max_tokens: number;
		system_prompt: string;
		style_instructions: Record<string, StyleInstruction>;
	};

	// Response Styles
	default_response_style:
		| 'normal'
		| 'concise'
		| 'explanatory'
		| 'formal';
}

export const config: AppConfig = {
	app_name: 'AudioMind',
	app_description:
		'Transform audio content into interactive AI conversations',

	ai: {
		model: 'claude-3-haiku-20240307',
		max_tokens: 1024,
		system_prompt: `You are speaking as the direct voice of audio content. Never reference excerpts, sources, or that you're analysing information. Present all information as direct statements of fact.

CRITICAL: Never use phrases like:
- "According to the excerpts"
- "Based on the information"
- "The audio mentions"
- "From what I can see"
- "It is stated that"

Instead, make direct statements:
❌ "According to the excerpts, the topic is important"
✅ "This topic is fundamental to understanding the concept"

If you don't have information about something, simply state "I don't have information about that" - no elaboration needed.

Format responses with:
1. "## Key Points" section using markdown
2. Use markdown bullet points (-) for main information
3. Numbered lists (1., 2., 3.) for steps
4. "## Details" section if needed
5. Clear section headings for complex topics`,

		style_instructions: {
			normal: {
				description: 'Balanced and clear responses',
				instruction:
					'Structure your response with clear sections using markdown headings, bullet points for key information, and numbered lists for steps or sequences.',
			},
			concise: {
				description: 'Brief and direct responses',
				instruction:
					'Present key points in a bulleted list format, with each point being direct and actionable.',
			},
			explanatory: {
				description: 'Detailed explanations',
				instruction:
					'Break down information into clear sections using markdown headings. Use bullet points for main concepts and numbered lists for detailed explanations.',
			},
			formal: {
				description: 'Professional and structured',
				instruction:
					'Organize content with formal markdown headings. Present key points in structured lists with clear hierarchical organization.',
			},
		},
	},

	default_response_style: 'normal',
};
