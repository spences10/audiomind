import type { UploadStage } from '$lib/stores/upload-progress.svelte';

export interface ProgressUpdate {
    stage: UploadStage;
    message: string;
    progress: number;
    current?: number;
    total?: number;
}

export interface ActionSuccess {
    success: true;
    processed_segments: number;
    total_segments: number;
    message: string;
    upload_id: string;
}

export interface ActionFailure {
    success?: false;
    error: string;
    upload_id: string;
}

export type ActionResult = ActionSuccess | ActionFailure; 