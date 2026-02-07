import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendMessage } from '$lib/server/claude-client';
import { requireAuth, getUserApiKey } from '$lib/server/auth';
import { GENERATION_SYSTEM_PROMPT } from '$lib/services/ai/prompts/generation-prompt';

export const POST: RequestHandler = async (event) => {
	const { user } = await requireAuth(event);
	console.info('[workout:create] /api/programs/generate request', { userId: user.id });

	const apiKey = await getUserApiKey(user.id);
	if (!apiKey) {
		console.warn('[workout:create] Missing API key for generation request', { userId: user.id });
		throw error(400, 'API key is required. Please add your Anthropic API key in Settings.');
	}

	const body = await event.request.json();
	const { messages } = body;

	if (!messages || !Array.isArray(messages)) {
		console.warn('[workout:create] Invalid messages payload for generation', {
			userId: user.id,
			payloadType: typeof messages
		});
		throw error(400, 'Messages array is required');
	}
	console.info('[workout:create] Preparing Claude generation request', {
		userId: user.id,
		messageCount: messages.length
	});

	const messagesWithPrompt = [
		...messages,
		{
			role: 'user' as const,
			content: 'Please generate my workout program now as JSON.'
		}
	];
	try {
		const response = await sendMessage(apiKey, messagesWithPrompt, GENERATION_SYSTEM_PROMPT);
		console.info('[workout:create] Claude generation completed', {
			userId: user.id,
			responseLength: response.length
		});
		return json({ text: response });
	} catch (err) {
		const details =
			err instanceof Error ? { name: err.name, message: err.message } : { message: String(err) };
		console.error('[workout:create] Claude generation failed', {
			userId: user.id,
			...details
		});
		throw err;
	}
};
