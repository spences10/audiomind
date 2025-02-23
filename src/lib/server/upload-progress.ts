import type { ProgressUpdate } from '$lib/types/upload';

// Store for progress listeners
const progress_listeners = new Map<
	string,
	Set<(data: ProgressUpdate) => void>
>();

// Store for queued updates until client connects
const queued_updates = new Map<string, ProgressUpdate[]>();

export function add_progress_listener(
	upload_id: string,
	listener: (data: ProgressUpdate) => void,
) {
	const listeners = progress_listeners.get(upload_id) || new Set();
	listeners.add(listener);
	progress_listeners.set(upload_id, listeners);

	// Send any queued updates
	const updates = queued_updates.get(upload_id) || [];
	updates.forEach((update) => listener(update));
	queued_updates.delete(upload_id);

	return () => {
		const listeners = progress_listeners.get(upload_id);
		if (listeners) {
			listeners.delete(listener);
			if (listeners.size === 0) {
				progress_listeners.delete(upload_id);
				queued_updates.delete(upload_id);
			}
		}
	};
}

export function update_progress(
	upload_id: string,
	data: ProgressUpdate,
) {
	const listeners = progress_listeners.get(upload_id);
	if (listeners && listeners.size > 0) {
		// If we have listeners, send directly
		listeners.forEach((listener) => listener(data));
	} else {
		// Queue the update until a client connects
		const updates = queued_updates.get(upload_id) || [];
		updates.push(data);
		queued_updates.set(upload_id, updates);
	}
}
