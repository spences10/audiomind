import { db } from '$lib/server/database';
import { transcribe_audio } from '$lib/server/deepgram';
import { generate_embedding } from '$lib/server/voyage';
import { upload_progress } from '$lib/stores/upload-progress.svelte';
import type { ResultSet } from '@libsql/client';
import { error, type RequestHandler } from '@sveltejs/kit';

interface Segment {
	text: string;
	start: number;
	end: number;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const audio = formData.get('audio');
		const title = formData.get('title');

		if (!audio || !(audio instanceof File)) {
			upload_progress.update_progress({
				stage: 'error',
				message: 'Missing or invalid audio file',
				progress: 0,
			});
			throw error(400, 'Missing or invalid audio file');
		}

		if (!title || typeof title !== 'string') {
			upload_progress.update_progress({
				stage: 'error',
				message: 'Missing or invalid episode title',
				progress: 0,
			});
			throw error(400, 'Missing or invalid episode title');
		}

		const buffer = await audio.arrayBuffer();

		// Start transcription
		upload_progress.update_progress({
			stage: 'transcribing',
			message: `Starting transcription for: ${title}`,
			progress: 0,
			current_operation: `File size: ${(buffer.byteLength / (1024 * 1024)).toFixed(2)}MB`,
		});

		const segments = (await transcribe_audio(buffer)) as Segment[];

		if (
			!segments ||
			!Array.isArray(segments) ||
			segments.length === 0
		) {
			upload_progress.update_progress({
				stage: 'error',
				message: 'Failed to transcribe audio or no segments produced',
				progress: 0,
			});
			throw error(
				400,
				'Failed to transcribe audio or no segments produced',
			);
		}

		const total_segments = segments.length;
		let processed_count = 0;

		upload_progress.update_progress({
			stage: 'processing_segments',
			message: `Processing ${segments.length} segments for episode: ${title}`,
			current: processed_count,
			total: total_segments,
			progress: 0,
		});

		for (const segment of segments) {
			if (!segment.text || typeof segment.text !== 'string') {
				console.warn('Skipping segment with invalid text:', segment);
				continue;
			}

			const start = parseFloat(String(segment.start)) || 0;
			const end = parseFloat(String(segment.end)) || 0;

			const insertResult = (await db.execute({
				sql: `INSERT INTO transcripts (episode_title, segment_text, start_time, end_time) 
					VALUES (?, ?, ?, ?) RETURNING id`,
				args: [title, segment.text, start, end],
			})) as ResultSet;

			const transcriptId = insertResult.rows[0]?.id;
			if (typeof transcriptId !== 'number') {
				throw new Error(
					'Failed to get transcript ID after insertion',
				);
			}

			const embedding = await generate_embedding(segment.text);
			const embedding_json = JSON.stringify({ vector: embedding });
			await db.execute({
				sql: `INSERT INTO embeddings (transcript_id, embedding) VALUES (?, ?)`,
				args: [transcriptId, embedding_json],
			});

			processed_count++;

			// Update progress
			upload_progress.update_progress({
				stage: 'processing_segments',
				message: `Processing segment ${processed_count}/${total_segments}`,
				current: processed_count,
				total: total_segments,
				progress: (processed_count / total_segments) * 100,
			});

			// Add a small delay to allow UI updates
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		upload_progress.update_progress({
			stage: 'completed',
			message: `Successfully processed ${processed_count} out of ${total_segments} segments`,
			current: processed_count,
			total: total_segments,
			progress: 100,
		});

		return new Response(
			JSON.stringify({
				success: true,
				processed_segments: processed_count,
				total_segments,
			}),
			{
				headers: { 'Content-Type': 'application/json' },
			},
		);
	} catch (err) {
		console.error('Process episode error:', err);
		const error_message =
			err instanceof Error ? err.message : 'Unknown error';

		upload_progress.update_progress({
			stage: 'error',
			message: error_message,
			progress: 0,
		});

		throw error(500, error_message);
	}
};
