import type { RequestHandler } from './$types';
import { shared_progress } from '$lib/server/shared-progress';

export const GET: RequestHandler = ({ setHeaders }) => {
    setHeaders({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    const stream = new ReadableStream({
        start(controller) {
            const encoder = new TextEncoder();
            
            const send_message = (data: any) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            // Subscribe to the shared progress store
            const unsubscribe = shared_progress.subscribe((state) => {
                send_message(state);
            });

            // Clean up on connection close
            return () => {
                unsubscribe();
                controller.close();
            };
        }
    });

    return new Response(stream);
} 