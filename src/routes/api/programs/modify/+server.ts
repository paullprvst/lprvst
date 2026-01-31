import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendMessage } from '$lib/server/claude-client';
import { requireAuth, getUserApiKey } from '$lib/server/auth';
import { REEVALUATION_SYSTEM_PROMPT } from '$lib/services/ai/prompts/reevaluation-prompt';

export const POST: RequestHandler = async (event) => {
	const { user } = await requireAuth(event);

	const apiKey = await getUserApiKey(user.id);
	if (!apiKey) {
		throw error(400, 'API key is required. Please add your Anthropic API key in Settings.');
	}

	const body = await event.request.json();
	const { messages, currentProgram, exerciseDetails } = body;

	if (!messages || !Array.isArray(messages)) {
		throw error(400, 'Messages array is required');
	}

	if (!currentProgram) {
		throw error(400, 'Current program is required');
	}

	const messagesWithContext = [
		{
			role: 'user' as const,
			content: `Current program:\n${JSON.stringify(currentProgram, null, 2)}${exerciseDetails ? `\n\nExercise Details (for reference when making modifications):\n${exerciseDetails}` : ''}`
		},
		...messages,
		{
			role: 'user' as const,
			content: 'Please provide the modified workout program as JSON.'
		}
	];

	const response = await sendMessage(apiKey, messagesWithContext, REEVALUATION_SYSTEM_PROMPT);
	return json({ text: response });
};
