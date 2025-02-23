export type UploadStage =
	| 'idle'
	| 'uploading'
	| 'transcribing'
	| 'processing_segments'
	| 'completed'
	| 'error';

const STAGE_DESCRIPTIONS = {
	idle: 'Ready to upload...',
	uploading: 'Uploading audio file...',
	transcribing: 'Transcribing audio with Deepgram...',
	processing_segments: 'Processing transcript segments...',
	completed: 'Upload and processing complete',
	error: 'An error occurred',
} as const;

type ProgressState = {
	stage: UploadStage;
	message: string;
	progress: number;
	current: number;
	total: number;
	start_time: number | null;
	current_operation: string;
	error?: string;
};

const initial_state: ProgressState = {
	stage: 'idle',
	message: STAGE_DESCRIPTIONS.idle,
	progress: 0,
	current: 0,
	total: 0,
	start_time: null,
	current_operation: '',
};

const create_upload_state = () => {
	const state = $state<ProgressState>(initial_state);

	return {
		// Getters for state values
		get stage() {
			return state.stage;
		},
		get message() {
			return state.message;
		},
		get progress() {
			return state.progress;
		},
		get current() {
			return state.current;
		},
		get total() {
			return state.total;
		},
		get start_time() {
			return state.start_time;
		},
		get current_operation() {
			return state.current_operation;
		},
		get error() {
			return state.error;
		},

		// Computed values
		get elapsed_time() {
			if (!state.start_time) return 0;
			return Math.floor((Date.now() - state.start_time) / 1000);
		},

		get is_processing() {
			return (
				state.stage !== 'idle' &&
				state.stage !== 'completed' &&
				state.stage !== 'error'
			);
		},

		// Methods
		start_upload: () => {
			state.stage = 'uploading';
			state.message = STAGE_DESCRIPTIONS.uploading;
			state.progress = 0;
			state.start_time = Date.now();
			state.current_operation = 'Preparing upload...';
		},

		update_progress: (data: Partial<ProgressState>) => {
			// Update stage and message together
			if (data.stage) {
				state.stage = data.stage;
				state.message = STAGE_DESCRIPTIONS[data.stage];

				// Set start time when transitioning to a processing stage
				if (
					data.stage !== 'idle' &&
					data.stage !== 'completed' &&
					data.stage !== 'error'
				) {
					if (!state.start_time) {
						state.start_time = Date.now();
					}
				} else if (
					data.stage === 'completed' ||
					data.stage === 'error'
				) {
					// Keep the final elapsed time
					state.start_time = state.start_time || Date.now() - 1000;
				}
			}

			// Update other fields if provided
			if (data.current !== undefined) state.current = data.current;
			if (data.total !== undefined) state.total = data.total;
			if (data.current_operation)
				state.current_operation = data.current_operation;

			// Calculate progress if we have current and total
			if (data.current !== undefined && data.total !== undefined) {
				state.progress = Math.min(
					100,
					Math.max(0, (data.current / data.total) * 100),
				);
			} else if (data.progress !== undefined) {
				state.progress = Math.min(100, Math.max(0, data.progress));
			}

			// Handle error state
			if (data.error) {
				state.stage = 'error';
				state.error = data.error;
				state.message = data.error;
			}
		},

		reset: () => {
			Object.assign(state, initial_state);
		},
	};
};

export const upload_progress = create_upload_state();
