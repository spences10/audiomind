import { db } from '$lib/server/database';
import { transcribe_audio } from '$lib/server/deepgram';
import { generate_embedding } from '$lib/server/voyage';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const form_data = await request.formData();
		const audio_file = form_data.get('audio') as File;
		const episode_title = form_data.get('title') as string;

		// Convert File to ArrayBuffer
		const array_buffer = await audio_file.arrayBuffer();

		// Get transcript
		const segments = await transcribe_audio(array_buffer);

		// Process each segment
		for (const segment of segments) {
			// Store transcript
			const result = await db.execute({
				sql: `INSERT INTO transcripts (episode_title, segment_text, start_time, end_time)
								VALUES (?, ?, ?, ?)
              `,
				args: [
					episode_title,
					segment.text,
					segment.start,
					segment.end,
				],
			});

			const transcript_id = (result as any).lastInsertId;

			// Generate and store embedding
			const embedding = await generate_embedding(segment.text);
			await db.execute({
				sql: `INSERT INTO embeddings (transcript_id, embedding) VALUES (?, ?)`,
				args: [
					transcript_id,
					Buffer.from(new Float32Array(embedding).buffer),
				],
			});
		}

		return json({ success: true });
	} catch (error) {
		console.error('Episode processing error:', error);
		return json(
			{ error: 'Failed to process episode' },
			{ status: 500 },
		);
	}
};
