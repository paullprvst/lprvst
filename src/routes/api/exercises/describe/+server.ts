import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { streamMessage, sendMessage } from '$lib/server/claude-client';
import { requireAuth } from '$lib/server/auth';
import { EXERCISE_DESCRIPTION_SYSTEM_PROMPT } from '$lib/services/ai/prompts/exercise-description-prompt';

export const POST: RequestHandler = async (event) => {
	await requireAuth(event);

	const body = await event.request.json();
	const { exerciseName, equipment, notes, stream = true } = body;

	if (!exerciseName) {
		throw error(400, 'Exercise name is required');
	}

	// Build the prompt
	let prompt = `Provide instructions for: ${exerciseName}`;
	if (equipment && equipment.length > 0) {
		prompt += `\nEquipment: ${equipment.join(', ')}`;
	}
	if (notes) {
		prompt += `\nAdditional context: ${notes}`;
	}

	const messages = [{ role: 'user' as const, content: prompt }];

	if (stream) {
		// Return streaming response using Server-Sent Events
		const encoder = new TextEncoder();

		const readable = new ReadableStream({
			async start(controller) {
				try {
					for await (const chunk of streamMessage(messages, EXERCISE_DESCRIPTION_SYSTEM_PROMPT)) {
						controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
					}
					controller.enqueue(encoder.encode('data: [DONE]\n\n'));
					controller.close();
				} catch (err) {
					console.error('Streaming error:', err);
					controller.enqueue(
						encoder.encode(`data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`)
					);
					controller.close();
				}
			}
		});

		return new Response(readable, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		});
	} else {
		// Return non-streaming response
		const response = await sendMessage(messages, EXERCISE_DESCRIPTION_SYSTEM_PROMPT);
		return json({ text: response });
	}
};
