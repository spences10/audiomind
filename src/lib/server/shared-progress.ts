import type { UploadStage } from '$lib/stores/upload-progress.svelte';

type ProgressState = {
	stage: UploadStage;
	message: string;
	progress: number;
	current: number;
	total: number;
	start_time: number | null;
};

const initial_state: ProgressState = {
	stage: 'idle',
	message: '',
	progress: 0,
	current: 0,
	total: 0,
	start_time: null,
};

const create_shared_progress = () => {
	let state = { ...initial_state };

	const subscribers = new Set<(state: ProgressState) => void>();

	return {
		subscribe: (callback: (state: ProgressState) => void) => {
			subscribers.add(callback);
			callback(state);
			return () => {
				subscribers.delete(callback);
			};
		},
		update_progress: (data: Partial<ProgressState>) => {
			state = {
				...state,
				...data,
				progress: Math.min(
					100,
					Math.max(0, data.progress ?? state.progress),
				),
			};
			subscribers.forEach((callback) => callback(state));
		},
		reset: () => {
			state = { ...initial_state };
			subscribers.forEach((callback) => callback(state));
		},
	};
};

export const shared_progress = create_shared_progress();
