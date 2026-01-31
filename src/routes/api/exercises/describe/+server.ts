import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { streamMessage, sendMessage } from '$lib/server/claude-client';
import { requireAuth, getUserApiKey } from '$lib/server/auth';
import { EXERCISE_DESCRIPTION_SYSTEM_PROMPT } from '$lib/services/ai/prompts/exercise-description-prompt';

export const POST: RequestHandler = async (event) => {
	const { user } = await requireAuth(event);

	const apiKey = await getUserApiKey(user.id);
	if (!apiKey) {
		throw error(400, 'API key is required. Please add your Anthropic API key in Settings.');
	}

	const body = await event.request.json();
	const { exerciseName, equipment, notes, stream = true } = body;

	if (!exerciseName) {
		throw error(400, 'Exercise name is required');
	}

	let prompt = `Provide instructions for: ${exerciseName}`;
	if (equipment && equipment.length > 0) {
		prompt += `\nEquipment: ${equipment.join(', ')}`;
	}
	if (notes) {
		prompt += `\nAdditional context: ${notes}`;
	}

	const messages = [{ role: 'user' as const, content: prompt }];

	if (stream) {
		const encoder = new TextEncoder();

		const readable = new ReadableStream({
			async start(controller) {
				try {
					for await (const chunk of streamMessage(apiKey, messages, EXERCISE_DESCRIPTION_SYSTEM_PROMPT)) {
						controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
					}
					controller.enqueue(encoder.encode('data: [DONE]\n\n'));
					controller.close();
				} catch (err) {
					const message = err instanceof Error ? err.message : 'Streaming failed';
					controller.enqueue(
						encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
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
		const response = await sendMessage(apiKey, messages, EXERCISE_DESCRIPTION_SYSTEM_PROMPT);
		return json({ text: response });
	}
};
