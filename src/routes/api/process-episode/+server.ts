import { db } from '$lib/server/database';
import { transcribe_audio } from '$lib/server/deepgram';
import { generate_embedding } from '$lib/server/voyage';
import type { ResultSet } from '@libsql/client';
import { error } from '@sveltejs/kit';

interface Segment {
	text: string;
	start: number;
	end: number;
}

export async function POST({ request }) {
	let transactionStarted = false;

	try {
		const formData = await request.formData();
		const audio = formData.get('audio');
		const title = formData.get('title');

		if (!audio || !(audio instanceof File)) {
			throw error(400, 'Missing or invalid audio file');
		}

		if (!title || typeof title !== 'string') {
			throw error(400, 'Missing or invalid episode title');
		}

		const buffer = await audio.arrayBuffer();
		const segments = (await transcribe_audio(buffer)) as Segment[];

		if (
			!segments ||
			!Array.isArray(segments) ||
			segments.length === 0
		) {
			throw error(
				400,
				'Failed to transcribe audio or no segments produced',
			);
		}

		console.log(
			`Processing ${segments.length} segments for episode: ${title}`,
		);

		// Begin transaction
		await db.execute('BEGIN TRANSACTION');
		transactionStarted = true;

		for (const segment of segments) {
			// Validate segment data before insertion
			if (!segment.text || typeof segment.text !== 'string') {
				console.warn('Skipping segment with invalid text:', segment);
				continue;
			}

			// Ensure numeric types for start/end times
			const start = parseFloat(String(segment.start)) || 0;
			const end = parseFloat(String(segment.end)) || 0;

			// Insert transcript and get the ID
			const insertResult = (await db.execute({
				sql: `INSERT INTO transcripts (episode_title, segment_text, start_time, end_time) 
					VALUES (?, ?, ?, ?) RETURNING id`,
				args: [title, segment.text, start, end],
			})) as ResultSet;

			const transcriptId = insertResult.rows[0]?.id;

			if (typeof transcriptId !== 'number') {
				throw new Error(
					`Failed to get transcript ID after insertion. Result: ${JSON.stringify(insertResult)}`,
				);
			}

			// Get embedding for the segment
			const embedding = await generate_embedding(segment.text);

			// Insert embedding with the correct transcript_id
			await db.execute({
				sql: `INSERT INTO embeddings (transcript_id, embedding) VALUES (?, ?)`,
				args: [transcriptId, embedding],
			});
		}

		// Commit transaction if everything succeeded
		await db.execute('COMMIT');
		transactionStarted = false;

		return new Response(JSON.stringify({ success: true }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err: unknown) {
		// Only attempt rollback if we know a transaction was started
		if (transactionStarted) {
			try {
				await db.execute('ROLLBACK');
			} catch (rollbackErr) {
				console.error('Error during rollback:', rollbackErr);
			}
		}

		console.error('Process episode error:', err);

		// Handle specific error types
		if (
			err instanceof Error &&
			'status' in err &&
			err.status === 400
		) {
			throw err; // Re-throw validation errors
		}

		const errorMessage =
			err instanceof Error ? err.message : 'Unknown error';
		console.error('Detailed error:', errorMessage);

		throw error(500, 'Failed to process episode: ' + errorMessage);
	}
}
