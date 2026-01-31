import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { streamMessage, sendMessage } from '$lib/server/claude-client';
import { requireAuth } from '$lib/server/auth';
import { ONBOARDING_SYSTEM_PROMPT } from '$lib/services/ai/prompts/onboarding-prompt';
import { REEVALUATION_CONVERSATION_PROMPT } from '$lib/services/ai/prompts/reevaluation-prompt';

export const POST: RequestHandler = async (event) => {
	await requireAuth(event);

	const body = await event.request.json();
	const { messages, conversationType, exerciseDetails, stream = true } = body;

	if (!messages || !Array.isArray(messages)) {
		throw error(400, 'Messages array is required');
	}

	if (!conversationType || !['onboarding', 'reevaluation'].includes(conversationType)) {
		throw error(400, 'Valid conversationType is required (onboarding or reevaluation)');
	}

	let systemPrompt =
		conversationType === 'onboarding'
			? ONBOARDING_SYSTEM_PROMPT
			: REEVALUATION_CONVERSATION_PROMPT;

	// For reevaluation conversations, include exercise details in the system prompt
	if (conversationType === 'reevaluation' && exerciseDetails) {
		systemPrompt += `\n\nExercise Details (for reference when discussing modifications):\n${exerciseDetails}`;
	}

	if (stream) {
		// Return streaming response using Server-Sent Events
		const encoder = new TextEncoder();

		const readable = new ReadableStream({
			async start(controller) {
				try {
					for await (const chunk of streamMessage(messages, systemPrompt)) {
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
		const response = await sendMessage(messages, systemPrompt);
		return json({ text: response });
	}
};
