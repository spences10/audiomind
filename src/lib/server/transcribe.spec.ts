import { describe, expect, test } from 'vite-plus/test';
import { merge_segments, parse_deepgram } from './transcribe.ts';

describe('transcribe parsing', () => {
	test('parses Deepgram paragraphs with speakers', () => {
		const result = parse_deepgram({
			metadata: { duration: 12 },
			results: {
				channels: [
					{
						alternatives: [
							{
								paragraphs: {
									paragraphs: [
										{
											speaker: 1,
											start: 0,
											end: 4,
											sentences: [
												{ text: 'Hi.' },
												{ text: 'Hello.' },
											],
										},
									],
								},
							},
						],
					},
				],
			},
		});
		expect(result.duration).toBe(12);
		expect(result.segments).toEqual([
			{ text: 'Hi. Hello.', start: 0, end: 4, speaker: 1 },
		]);
	});

	test('merges short segments up to the chunk size', () => {
		const merged = merge_segments([
			{ text: 'a', start: 0, end: 1, speaker: null },
			{ text: 'b', start: 1, end: 2, speaker: null },
			{ text: 'x'.repeat(1000), start: 2, end: 3, speaker: null },
		]);
		expect(merged).toHaveLength(2);
		expect(merged[0]).toEqual({
			text: 'a b',
			start: 0,
			end: 2,
			speaker: null,
		});
	});
});
