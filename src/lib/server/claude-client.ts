import Anthropic from '@anthropic-ai/sdk';
import type {
	MessageParam,
	TextBlockParam,
	Tool,
	ToolResultBlockParam,
	ToolUseBlockParam
} from '@anthropic-ai/sdk/resources/messages';
import type { StepLogger } from '$lib/server/step-tracer';

const MODEL = 'claude-sonnet-4-5';
const MAX_TOKENS = 16384;
const MAX_RETRIES = 2;
const MAX_TOOL_ROUNDS = 6;
const RETRYABLE_ERROR_MARKERS = ['529', 'overloaded', 'rate limit', 'timeout', 'network'];

type AssistantMessage = { role: 'user' | 'assistant'; content: string };
export type { StepLogger };

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

function summarizeToolErrorForLog(message: string): Record<string, unknown> {
	const trimmed = message.trim();
	if (trimmed.startsWith('[')) {
		try {
			const parsed = JSON.parse(trimmed) as Array<{
				code?: unknown;
				path?: unknown;
				message?: unknown;
			}>;
			if (Array.isArray(parsed) && parsed.length > 0) {
				const first = parsed[0];
				const firstPath = Array.isArray(first.path)
					? first.path.map((segment) => String(segment)).join('.')
					: undefined;
				return {
					errorType: 'validation',
					issueCount: parsed.length,
					firstIssueCode: typeof first.code === 'string' ? first.code : undefined,
					firstIssuePath: firstPath,
					firstIssueMessage: typeof first.message === 'string' ? first.message : undefined
				};
			}
		} catch {
			// fall through to plain summary
		}
	}

	return {
		errorType: 'runtime',
		errorMessage: message.length > 220 ? `${message.slice(0, 220)}...` : message
	};
}

async function withRetry<T>(
	operation: () => Promise<T>,
	options?: {
		operationLabel?: string;
		operationData?: Record<string, unknown>;
		logStep?: StepLogger;
	}
): Promise<T> {
	let lastError: unknown;
	const operationLabel = options?.operationLabel ?? 'unknown';
	const operationData = options?.operationData ?? {};
	const logStep = options?.logStep;

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		logStep?.('claude.api_call.start', {
			operation: operationLabel,
			...operationData,
			attempt: attempt + 1,
			maxAttempts: MAX_RETRIES + 1
		});
		try {
			const result = await operation();
			logStep?.('claude.api_call.done', {
				operation: operationLabel,
				...operationData,
				attempt: attempt + 1
			});
			return result;
		} catch (error) {
			lastError = error;
			logStep?.('claude.api_call.error', {
				operation: operationLabel,
				...operationData,
				attempt: attempt + 1,
				errorMessage: error instanceof Error ? error.message : String(error)
			});
			if (attempt === MAX_RETRIES || !isRetryableError(error)) {
				throw error;
			}
			const delayMs = 400 * Math.pow(2, attempt);
			logStep?.('claude.api_call.retry', {
				operation: operationLabel,
				...operationData,
				nextAttempt: attempt + 2,
				delayMs
			});
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}

	throw lastError instanceof Error ? lastError : new Error('Claude request failed');
}

export async function sendMessage(
	apiKey: string,
	messages: AssistantMessage[],
	systemPrompt: string,
	logStep?: StepLogger
): Promise<string> {
	const client = new Anthropic({ apiKey });
	logStep?.('claude.text.start', {
		messageCount: messages.length
	});

	const response = await withRetry(() =>
		client.messages.create({
			model: MODEL,
			max_tokens: MAX_TOKENS,
			system: systemPrompt,
			messages: toMessageParams(messages)
		}),
		{
			operationLabel: 'text_response',
			logStep
		}
	);

	const content = response.content[0];
	if (content.type === 'text') {
		logStep?.('claude.text.response.parsed', {
			textLength: content.text.length
		});
		return content.text;
	}
	throw new Error('Unexpected response type');
}

export async function sendMessageWithTools(
	apiKey: string,
	messages: AssistantMessage[],
	systemPrompt: string,
	toolDefinitions: ClaudeToolDefinition[],
	logStep?: StepLogger
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
	logStep?.('claude.tools.start', {
		messageCount: messages.length,
		toolCount: anthropicTools.length,
		maxRounds: MAX_TOOL_ROUNDS
	});

	for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
		const roundNumber = round + 1;
		const response = await withRetry(() =>
			client.messages.create({
				model: MODEL,
				max_tokens: MAX_TOKENS,
				system: systemPrompt,
				messages: conversationMessages,
				tools: anthropicTools,
				tool_choice: { type: 'auto', disable_parallel_tool_use: true }
			}),
			{
				operationLabel: 'tool_round',
				operationData: { round: roundNumber },
				logStep
			}
		);
		logStep?.('claude.tools.round.api_call.done', {
			round: roundNumber,
			stopReason: response.stop_reason,
			contentBlockCount: response.content.length
		});

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
			logStep?.('claude.tools.completed_without_tool_use', {
				round: roundNumber,
				toolExecutionCount: toolExecutions.length
			});
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
			logStep?.('claude.tools.tool_execution.start', {
				round: roundNumber,
				toolName: toolUse.name
			});
			const execution: ClaudeToolExecution = {
				toolName: toolUse.name,
				toolUseId: toolUse.id,
				input: toolUse.input
			};
			const tool = toolByName.get(toolUse.name);
			if (!tool) {
				execution.error = `Unknown tool: ${toolUse.name}`;
				toolExecutions.push(execution);
				logStep?.('claude.tools.tool_execution.unknown_tool', {
					round: roundNumber,
					toolName: toolUse.name
				});
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
				logStep?.('claude.tools.tool_execution.success', {
					round: roundNumber,
					toolName: toolUse.name
				});
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
				logStep?.('claude.tools.tool_execution.failure', {
					round: roundNumber,
					toolName: toolUse.name,
					...summarizeToolErrorForLog(message)
				});
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
		logStep?.('claude.tools.round.tool_results.done', {
			round: roundNumber,
			toolResultCount: toolResults.length,
			hasSuccessfulToolExecution
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
				}),
				{
					operationLabel: 'final_response_after_tool',
					operationData: { round: roundNumber },
					logStep
				}
			);
			const finalText = contentBlocksToText(finalResponse.content).trim();
			logStep?.('claude.tools.final_response.api_call.done', {
				round: roundNumber,
				textLength: finalText.length,
				toolExecutionCount: toolExecutions.length
			});
			return {
				text: finalText,
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
