import { DEEPGRAM_API_KEY } from '$env/static/private';
import { createClient } from '@deepgram/sdk';
import { Buffer } from 'buffer';

export async function transcribe_audio(audio_buffer: ArrayBuffer) {
	try {
		const deepgram = createClient(DEEPGRAM_API_KEY);
		const buffer = Buffer.from(audio_buffer);

		const { result, error } =
			await deepgram.listen.prerecorded.transcribeFile(buffer, {
				model: 'nova-2',
				smart_format: true,
				utterances: true,
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

		// Transform the paragraphs to include the text from sentences
		return paragraphs.map((para: any) => {
			// Combine all sentences in the paragraph into a single text
			const combinedText = para.sentences
				?.map((sentence: any) => sentence.text)
				?.join(' ') || '';

			return {
				text: combinedText,
				start: para.start || 0,
				end: para.end || 0,
			};
		});
	} catch (error) {
		console.error('Transcription error:', error);
		if (error instanceof Error) {
			throw new Error(`Transcription failed: ${error.message}`);
		}
		throw error;
	}
}
