import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from '$env/static/private';

if (!ANTHROPIC_API_KEY) {
	throw new Error('ANTHROPIC_API_KEY environment variable is required');
}

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 16384;

export async function sendMessage(
	messages: Array<{ role: 'user' | 'assistant'; content: string }>,
	systemPrompt: string
): Promise<string> {
	const response = await client.messages.create({
		model: MODEL,
		max_tokens: MAX_TOKENS,
		system: systemPrompt,
		messages
	});

	const content = response.content[0];
	if (content.type === 'text') {
		return content.text;
	}
	throw new Error('Unexpected response type');
}

export async function* streamMessage(
	messages: Array<{ role: 'user' | 'assistant'; content: string }>,
	systemPrompt: string
): AsyncGenerator<string, void, unknown> {
	const stream = await client.messages.create({
		model: MODEL,
		max_tokens: MAX_TOKENS,
		system: systemPrompt,
		messages,
		stream: true
	});

	for await (const event of stream) {
		if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
			yield event.delta.text;
		}
	}
}
