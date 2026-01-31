import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendMessage } from '$lib/server/claude-client';
import { requireAuth } from '$lib/server/auth';
import { GENERATION_SYSTEM_PROMPT } from '$lib/services/ai/prompts/generation-prompt';

export const POST: RequestHandler = async (event) => {
	await requireAuth(event);

	const body = await event.request.json();
	const { messages } = body;

	if (!messages || !Array.isArray(messages)) {
		throw error(400, 'Messages array is required');
	}

	// Add final prompt to generate the program
	const messagesWithPrompt = [
		...messages,
		{
			role: 'user' as const,
			content: 'Please generate my workout program now as JSON.'
		}
	];

	const response = await sendMessage(messagesWithPrompt, GENERATION_SYSTEM_PROMPT);
	return json({ text: response });
};
