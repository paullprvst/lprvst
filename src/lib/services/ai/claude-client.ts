import Anthropic from '@anthropic-ai/sdk';

export class ClaudeClient {
	private client: Anthropic | null = null;
	private lastRequestTime = 0;
	private readonly MIN_REQUEST_DELAY = 1000;

	constructor(apiKey?: string) {
		const key =
			apiKey ||
			(typeof localStorage !== 'undefined' ? localStorage.getItem('anthropic_api_key') : null);
		if (key) {
			this.client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
		}
	}

	private ensureClient(): void {
		if (!this.client) {
			const key =
				typeof localStorage !== 'undefined' ? localStorage.getItem('anthropic_api_key') : null;
			if (!key) {
				throw new Error('Anthropic API key is required. Please set it in Settings.');
			}
			this.client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
		}
	}

	private async rateLimit(): Promise<void> {
		const now = Date.now();
		const timeSinceLastRequest = now - this.lastRequestTime;
		if (timeSinceLastRequest < this.MIN_REQUEST_DELAY) {
			await new Promise((resolve) =>
				setTimeout(resolve, this.MIN_REQUEST_DELAY - timeSinceLastRequest)
			);
		}
		this.lastRequestTime = Date.now();
	}

	async sendMessage(
		messages: Array<{ role: 'user' | 'assistant'; content: string }>,
		systemPrompt: string
	): Promise<string> {
		this.ensureClient();
		await this.rateLimit();

		const response = await this.client!.messages.create({
			model: 'claude-3-5-sonnet-20241022',
			max_tokens: 4096,
			system: systemPrompt,
			messages
		});

		const content = response.content[0];
		if (content.type === 'text') {
			return content.text;
		}
		throw new Error('Unexpected response type');
	}

	async streamMessage(
		messages: Array<{ role: 'user' | 'assistant'; content: string }>,
		systemPrompt: string,
		onChunk: (text: string) => void
	): Promise<void> {
		this.ensureClient();
		await this.rateLimit();

		const stream = await this.client!.messages.create({
			model: 'claude-3-5-sonnet-20241022',
			max_tokens: 4096,
			system: systemPrompt,
			messages,
			stream: true
		});

		for await (const event of stream) {
			if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
				onChunk(event.delta.text);
			}
		}
	}
}

export const claudeClient = new ClaudeClient();
