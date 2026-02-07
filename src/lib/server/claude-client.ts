import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 16384;
const MAX_RETRIES = 2;
const RETRYABLE_ERROR_MARKERS = ['529', 'overloaded', 'rate limit', 'timeout', 'network'];

function isRetryableError(error: unknown): boolean {
	if (!error) return false;
	const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
	return RETRYABLE_ERROR_MARKERS.some((marker) => message.includes(marker));
}

async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
	let lastError: unknown;

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error;
			if (attempt === MAX_RETRIES || !isRetryableError(error)) {
				throw error;
			}
			const delayMs = 400 * Math.pow(2, attempt);
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}

	throw lastError instanceof Error ? lastError : new Error('Claude request failed');
}

export async function sendMessage(
	apiKey: string,
	messages: Array<{ role: 'user' | 'assistant'; content: string }>,
	systemPrompt: string
): Promise<string> {
	const client = new Anthropic({ apiKey });

	const response = await withRetry(() =>
		client.messages.create({
			model: MODEL,
			max_tokens: MAX_TOKENS,
			system: systemPrompt,
			messages
		})
	);

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

	const stream = await withRetry(() =>
		client.messages.create({
			model: MODEL,
			max_tokens: MAX_TOKENS,
			system: systemPrompt,
			messages,
			stream: true
		})
	);

	for await (const event of stream) {
		if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
			yield event.delta.text;
		}
	}
}
