import { DEEPGRAM_API_KEY } from '$env/static/private';
import { createClient } from '@deepgram/sdk';

export async function transcribe_audio(audio_buffer: ArrayBuffer) {
	try {
		const deepgram = createClient(DEEPGRAM_API_KEY);

		const { result, error } =
			await deepgram.listen.prerecorded.transcribeFile(audio_buffer, {
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
			result.results.channels[0].alternatives[0].paragraphs
				.paragraphs;

		// Transform the paragraphs to include the text from sentences
		return paragraphs.map((para: any) => {
			// Combine all sentences in the paragraph into a single text
			const combinedText = para.sentences
				.map((sentence: any) => sentence.text)
				.join(' ');

			return {
				text: combinedText,
				start: para.start,
				end: para.end,
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
