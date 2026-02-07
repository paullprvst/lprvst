import Anthropic from '@anthropic-ai/sdk';
import type {
	MessageParam,
	TextBlockParam,
	Tool,
	ToolResultBlockParam,
	ToolUseBlockParam
} from '@anthropic-ai/sdk/resources/messages';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 16384;
const MAX_RETRIES = 2;
const MAX_TOOL_ROUNDS = 6;
const RETRYABLE_ERROR_MARKERS = ['529', 'overloaded', 'rate limit', 'timeout', 'network'];

type AssistantMessage = { role: 'user' | 'assistant'; content: string };

export interface ClaudeToolDefinition<TInput = unknown, TResult = unknown> {
	name: string;
	description: string;
	inputSchema: Tool['input_schema'];
	execute: (input: TInput) => Promise<TResult> | TResult;
}

export interface ClaudeToolExecution {
	toolName: string;
	toolUseId: string;
	input: unknown;
	result?: unknown;
	error?: string;
}

export interface ClaudeToolResponse {
	text: string;
	toolExecutions: ClaudeToolExecution[];
}

function toMessageParams(messages: AssistantMessage[]): MessageParam[] {
	return messages.map((message) => ({
		role: message.role,
		content: message.content
	}));
}

function contentBlocksToText(content: Anthropic.Messages.ContentBlock[]): string {
	return content
		.filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
		.map((block) => block.text)
		.join('');
}

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
	messages: AssistantMessage[],
	systemPrompt: string
): Promise<string> {
	const client = new Anthropic({ apiKey });

	const response = await withRetry(() =>
		client.messages.create({
			model: MODEL,
			max_tokens: MAX_TOKENS,
			system: systemPrompt,
			messages: toMessageParams(messages)
		})
	);

	const content = response.content[0];
	if (content.type === 'text') {
		return content.text;
	}
	throw new Error('Unexpected response type');
}

export async function sendMessageWithTools(
	apiKey: string,
	messages: AssistantMessage[],
	systemPrompt: string,
	toolDefinitions: ClaudeToolDefinition[]
): Promise<ClaudeToolResponse> {
	const client = new Anthropic({ apiKey });
	const toolExecutions: ClaudeToolExecution[] = [];
	const toolByName = new Map(toolDefinitions.map((tool) => [tool.name, tool]));
	const anthropicTools: Tool[] = toolDefinitions.map((tool) => ({
		name: tool.name,
		description: tool.description,
		input_schema: tool.inputSchema
	}));

	const conversationMessages: MessageParam[] = toMessageParams(messages);
	let latestTextResponse = '';

	for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
		const response = await withRetry(() =>
			client.messages.create({
				model: MODEL,
				max_tokens: MAX_TOKENS,
				system: systemPrompt,
				messages: conversationMessages,
				tools: anthropicTools,
				tool_choice: { type: 'auto', disable_parallel_tool_use: true }
			})
		);

		const assistantContent: Array<TextBlockParam | ToolUseBlockParam> = [];
		const toolUses: Anthropic.Messages.ToolUseBlock[] = [];
		latestTextResponse = contentBlocksToText(response.content);

		for (const block of response.content) {
			if (block.type === 'text') {
				assistantContent.push({ type: 'text', text: block.text });
				continue;
			}

			if (block.type === 'tool_use') {
				assistantContent.push({
					type: 'tool_use',
					id: block.id,
					name: block.name,
					input: block.input
				});
				toolUses.push(block);
			}
		}

		conversationMessages.push({
			role: 'assistant',
			content: assistantContent.length === 0 ? '' : assistantContent
		});

		if (response.stop_reason !== 'tool_use') {
			return {
				text: latestTextResponse.trim(),
				toolExecutions
			};
		}

		if (toolUses.length === 0) {
			throw new Error('Tool use was requested, but no tool call was returned');
		}

		const toolResults: ToolResultBlockParam[] = [];
		let hasSuccessfulToolExecution = false;
		for (const toolUse of toolUses) {
			const execution: ClaudeToolExecution = {
				toolName: toolUse.name,
				toolUseId: toolUse.id,
				input: toolUse.input
			};
			const tool = toolByName.get(toolUse.name);
			if (!tool) {
				execution.error = `Unknown tool: ${toolUse.name}`;
				toolExecutions.push(execution);
				toolResults.push({
					type: 'tool_result',
					tool_use_id: toolUse.id,
					is_error: true,
					content: execution.error
				});
				continue;
			}

			try {
				const result = await tool.execute(toolUse.input);
				execution.result = result;
				hasSuccessfulToolExecution = true;
				toolExecutions.push(execution);
				toolResults.push({
					type: 'tool_result',
					tool_use_id: toolUse.id,
					content:
						typeof result === 'string' ? result : JSON.stringify(result, null, 2)
				});
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				execution.error = message;
				toolExecutions.push(execution);
				toolResults.push({
					type: 'tool_result',
					tool_use_id: toolUse.id,
					is_error: true,
					content: message
				});
			}
		}

		conversationMessages.push({
			role: 'user',
			content: toolResults
		});

		// Once a tool succeeds, produce a final user-facing assistant turn without tools.
		// This prevents repeated tool calls from looping indefinitely.
		if (hasSuccessfulToolExecution) {
			const finalResponse = await withRetry(() =>
				client.messages.create({
					model: MODEL,
					max_tokens: MAX_TOKENS,
					system: systemPrompt,
					messages: conversationMessages
				})
			);
			return {
				text: contentBlocksToText(finalResponse.content).trim(),
				toolExecutions
			};
		}
	}

	throw new Error(`Tool loop exceeded ${MAX_TOOL_ROUNDS} rounds without completion`);
}

export async function* streamMessage(
	apiKey: string,
	messages: AssistantMessage[],
	systemPrompt: string
): AsyncGenerator<string, void, unknown> {
	const client = new Anthropic({ apiKey });

	const stream = await withRetry(() =>
		client.messages.create({
			model: MODEL,
			max_tokens: MAX_TOKENS,
			system: systemPrompt,
			messages: toMessageParams(messages),
			stream: true
		})
	);

	for await (const event of stream) {
		if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
			yield event.delta.text;
		}
	}
}
