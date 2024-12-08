import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/database';
import { transcribe_audio } from '$lib/server/deepgram';
import { generate_embedding } from '$lib/server/voyage';
import type { ResultSet } from '@libsql/client';
import { shared_progress } from '$lib/server/shared-progress';

interface Segment {
	text: string;
	start: number;
	end: number;
}

export const actions = {
	default: async ({ request }) => {
		try {
			const formData = await request.formData();
			const audio = formData.get('audio');
			const title = formData.get('title');

			if (!audio || !(audio instanceof File)) {
				shared_progress.update_progress({
					stage: 'error',
					message: 'Missing or invalid audio file',
					progress: 0
				});
				return fail(400, { error: 'Missing or invalid audio file' });
			}

			if (!title || typeof title !== 'string') {
				shared_progress.update_progress({
					stage: 'error',
					message: 'Missing or invalid episode title',
					progress: 0
				});
				return fail(400, { error: 'Missing or invalid episode title' });
			}

			const buffer = await audio.arrayBuffer();
			
			shared_progress.update_progress({
				stage: 'transcribing',
				message: `Starting transcription for: ${title}`,
				progress: 0
			});

			const segments = (await transcribe_audio(buffer)) as Segment[];

			if (!segments || !Array.isArray(segments) || segments.length === 0) {
				shared_progress.update_progress({
					stage: 'error',
					message: 'Failed to transcribe audio or no segments produced',
					progress: 0
				});
				return fail(400, { error: 'Failed to transcribe audio or no segments produced' });
			}

			const total_segments = segments.length;
			let processed_count = 0;

			shared_progress.update_progress({
				stage: 'processing_segments',
				message: `Processing ${segments.length} segments for episode: ${title}`,
				current: processed_count,
				total: total_segments,
				progress: 0
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
					throw new Error('Failed to get transcript ID after insertion');
				}

				const embedding = await generate_embedding(segment.text);
				const embedding_json = JSON.stringify({ vector: embedding });
				await db.execute({
					sql: `INSERT INTO embeddings (transcript_id, embedding) VALUES (?, ?)`,
					args: [transcriptId, embedding_json],
				});

				processed_count++;
				
				shared_progress.update_progress({
					stage: 'processing_segments',
					message: `Processing segment ${processed_count}/${total_segments}`,
					current: processed_count,
					total: total_segments,
					progress: (processed_count / total_segments) * 100
				});

				// Small delay to prevent overwhelming the client
				await new Promise(resolve => setTimeout(resolve, 10));
			}

			shared_progress.update_progress({
				stage: 'completed',
				message: `Successfully processed ${processed_count} out of ${total_segments} segments`,
				current: processed_count,
				total: total_segments,
				progress: 100
			});

			return {
				success: true,
				processed_segments: processed_count,
				total_segments
			};

		} catch (err) {
			console.error('Process episode error:', err);
			const error_message = err instanceof Error ? err.message : 'Unknown error';
			
			shared_progress.update_progress({
				stage: 'error',
				message: error_message,
				progress: 0
			});

			return fail(500, { error: 'Failed to process episode: ' + error_message });
		}
	}
} satisfies Actions;
