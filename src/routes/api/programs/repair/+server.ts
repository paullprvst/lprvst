import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendMessage } from '$lib/server/claude-client';
import { requireAuth, getUserApiKey } from '$lib/server/auth';
import { REPAIR_PROGRAM_JSON_PROMPT } from '$lib/services/ai/prompts/repair-program-prompt';

export const POST: RequestHandler = async (event) => {
	const { user } = await requireAuth(event);
	console.info('[workout:create] /api/programs/repair request', { userId: user.id });

	const apiKey = await getUserApiKey(user.id);
	if (!apiKey) {
		console.warn('[workout:create] Missing API key for repair request', { userId: user.id });
		throw error(400, 'API key is required. Please add your Anthropic API key in Settings.');
	}

	const body = await event.request.json();
	const { rawText, parseError, validationError, currentProgram } = body;

	if (!rawText || typeof rawText !== 'string') {
		console.warn('[workout:create] Invalid rawText for repair', {
			userId: user.id,
			rawTextType: typeof rawText
		});
		throw error(400, 'rawText is required');
	}
	console.info('[workout:create] Preparing Claude repair request', {
		userId: user.id,
		rawTextLength: rawText.length,
		hasParseError: Boolean(parseError),
		hasValidationError: Boolean(validationError),
		hasCurrentProgram: Boolean(currentProgram)
	});

	const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
		{
			role: 'user',
			content: [
				'Please repair this program output into valid JSON.',
				`Parse error: ${parseError || 'n/a'}`,
				`Validation error: ${validationError || 'n/a'}`,
				currentProgram ? `Current program (preserve IDs where possible): ${JSON.stringify(currentProgram)}` : '',
				`Malformed output:\n${rawText}`
			]
				.filter(Boolean)
				.join('\n\n')
		}
	];

	try {
		const response = await sendMessage(apiKey, messages, REPAIR_PROGRAM_JSON_PROMPT);
		console.info('[workout:create] Claude repair completed', {
			userId: user.id,
			responseLength: response.length
		});
		return json({ text: response });
	} catch (err) {
		const details =
			err instanceof Error ? { name: err.name, message: err.message } : { message: String(err) };
		console.error('[workout:create] Claude repair failed', {
			userId: user.id,
			...details
		});
		throw err;
	}
};
