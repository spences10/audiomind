import { DEEPGRAM_API_KEY } from '$app/env/private';
import { DeepgramClient } from '@deepgram/sdk';

export interface Segment {
	text: string;
	start: number;
	end: number;
}

export async function transcribe_audio(
	audio_buffer: ArrayBuffer,
): Promise<Segment[]> {
	const deepgram = new DeepgramClient({ apiKey: DEEPGRAM_API_KEY });
	const buffer = Buffer.from(audio_buffer);

	// SDK v5 throws on API errors instead of returning { error }
	const result = await deepgram.listen.v1.media.transcribeFile(
		buffer,
		{
			model: 'nova-2',
			smart_format: true,
			utterances: true,
		},
	);

	const paragraphs =
		'results' in result &&
		result.results?.channels?.[0]?.alternatives?.[0]?.paragraphs
			?.paragraphs;

	if (!paragraphs) {
		throw new Error('No transcription results');
	}

	return paragraphs.map((para) => ({
		text: para.sentences?.map((s) => s.text ?? '').join(' ') || '',
		start: para.start || 0,
		end: para.end || 0,
	}));
}
