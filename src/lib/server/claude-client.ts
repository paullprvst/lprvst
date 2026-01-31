import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 16384;

export async function sendMessage(
	apiKey: string,
	messages: Array<{ role: 'user' | 'assistant'; content: string }>,
	systemPrompt: string
): Promise<string> {
	const client = new Anthropic({ apiKey });

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
	apiKey: string,
	messages: Array<{ role: 'user' | 'assistant'; content: string }>,
	systemPrompt: string
): AsyncGenerator<string, void, unknown> {
	const client = new Anthropic({ apiKey });

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
