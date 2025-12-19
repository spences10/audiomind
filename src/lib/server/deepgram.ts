import { DEEPGRAM_API_KEY } from '$env/static/private';
import { createClient } from '@deepgram/sdk';

export interface Segment {
	text: string;
	start: number;
	end: number;
}

export async function transcribe_audio(
	audio_buffer: ArrayBuffer,
): Promise<Segment[]> {
	const deepgram = createClient(DEEPGRAM_API_KEY);
	const buffer = Buffer.from(audio_buffer);

	const { result, error } =
		await deepgram.listen.prerecorded.transcribeFile(buffer, {
			model: 'nova-2',
			smart_format: true,
			utterances: true,
		});

	if (error) {
		throw new Error(`Deepgram error: ${error.message}`);
	}

	const paragraphs =
		result?.results?.channels?.[0]?.alternatives?.[0]?.paragraphs
			?.paragraphs;

	if (!paragraphs) {
		throw new Error('No transcription results');
	}

	return paragraphs.map(
		(para: {
			sentences?: { text: string }[];
			start?: number;
			end?: number;
		}) => ({
			text: para.sentences?.map((s) => s.text).join(' ') || '',
			start: para.start || 0,
			end: para.end || 0,
		}),
	);
}
