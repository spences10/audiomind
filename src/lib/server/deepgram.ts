import { DEEPGRAM_API_KEY } from '$env/static/private';
import { upload_progress } from '$lib/stores/upload-progress.svelte';
import { createClient } from '@deepgram/sdk';
import { Buffer } from 'buffer';

const MAX_TIMEOUT = 300000; // 5 minutes for larger files
const MB = 1024 * 1024;

export async function transcribe_audio(audio_buffer: ArrayBuffer) {
	try {
		const file_size_mb = audio_buffer.byteLength / MB;
		const deepgram = createClient(DEEPGRAM_API_KEY);
		const buffer = Buffer.from(audio_buffer);

		// Update progress with file size info
		upload_progress.update_progress({
			current_operation: `Processing ${file_size_mb.toFixed(2)}MB audio file...`,
			progress: 5,
		});

		// Estimate timeout based on file size (minimum 30 seconds)
		const estimated_timeout = Math.min(
			MAX_TIMEOUT,
			Math.max(30000, file_size_mb * 5000),
		);

		// Update progress to indicate we're starting the API call
		upload_progress.update_progress({
			current_operation: `Connecting to Deepgram API (timeout: ${Math.round(estimated_timeout / 1000)}s)...`,
			progress: 10,
		});

		const controller = new AbortController();
		const timeout = setTimeout(
			() => controller.abort(),
			estimated_timeout,
		);

		try {
			const { result, error } =
				await deepgram.listen.prerecorded.transcribeFile(buffer, {
					model: 'nova-2',
					smart_format: true,
					utterances: true,
					options: {
						signal: controller.signal,
					},
				});

			clearTimeout(timeout);

			// Update progress to indicate we've received the response
			upload_progress.update_progress({
				current_operation: 'Processing transcription response...',
				progress: 50,
			});

			if (error) {
				throw new Error(
					`Deepgram transcription error: ${error.message}`,
				);
			}

			const paragraphs =
				result?.results?.channels?.[0]?.alternatives?.[0]?.paragraphs
					?.paragraphs;

			if (!paragraphs) {
				throw new Error('No transcription results found');
			}

			// Update progress to indicate we're processing the paragraphs
			upload_progress.update_progress({
				current_operation: `Found ${paragraphs.length} segments to process`,
				progress: 90,
			});

			return paragraphs.map((para: any) => {
				const combinedText =
					para.sentences
						?.map((sentence: any) => sentence.text)
						?.join(' ') || '';
				return {
					text: combinedText,
					start: para.start || 0,
					end: para.end || 0,
				};
			});
		} catch (err: unknown) {
			clearTimeout(timeout);
			if (err instanceof Error && err.name === 'AbortError') {
				throw new Error(
					`Transcription timed out after ${Math.round(estimated_timeout / 1000)} seconds. Try again or use a smaller file.`,
				);
			}
			throw err;
		}
	} catch (error) {
		console.error('Transcription error:', error);
		if (error instanceof Error) {
			throw new Error(`Transcription failed: ${error.message}`);
		}
		throw error;
	}
}
