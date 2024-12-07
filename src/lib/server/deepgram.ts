import { DEEPGRAM_API_KEY } from '$env/static/private';

export async function transcribe_audio(audio_buffer: ArrayBuffer) {
	const response = await fetch(
		'https://api.deepgram.com/v1/listen?model=nova&smart_format=true&paragraphs=true&punctuate=true',
		{
			method: 'POST',
			headers: {
				Authorization: `Token ${DEEPGRAM_API_KEY}`,
				'Content-Type': 'audio/wav',
			},
			body: audio_buffer,
		},
	);

	if (!response.ok) {
		throw new Error(`Deepgram API error: ${response.statusText}`);
	}

	const data = await response.json();
	return data.results.channels[0].alternatives[0].paragraphs
		.paragraphs;
}
