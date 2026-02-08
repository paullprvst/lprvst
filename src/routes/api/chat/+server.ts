import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendMessage, sendMessageWithTools, streamMessage } from '$lib/server/claude-client';
import { requireAuth, getUserApiKey } from '$lib/server/auth';
import { z } from 'zod';
import { ONBOARDING_SYSTEM_PROMPT } from '$lib/services/ai/prompts/onboarding-prompt';
import { REEVALUATION_CONVERSATION_PROMPT } from '$lib/services/ai/prompts/reevaluation-prompt';
import { featureFlags } from '$lib/utils/feature-flags';
import {
	getWorkoutAgentTools,
	isAgentAction,
	loadReevaluationContext
} from '$lib/server/workout-agent-tools';
import type { AgentAction, AgentTurnResponse } from '$lib/types/agent';
import type { Program } from '$lib/types/program';
import { createStepLogger, logAndRethrow } from '$lib/server/step-tracer';

const chatRequestSchema = z.object({
	messages: z.array(
		z.object({
			role: z.enum(['user', 'assistant']),
			content: z.string()
		})
	),
	conversationType: z.enum(['onboarding', 'reevaluation']),
	programId: z.string().optional(),
	stream: z.boolean().optional()
});

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function buildScheduleReference(program: Program): string {
	if (!program.schedule.weeklyPattern.length) return '- No scheduled workouts';

	return [...program.schedule.weeklyPattern]
		.sort((a, b) => a.dayOfWeek - b.dayOfWeek)
		.map((item) => {
			const workout = program.workouts[item.workoutIndex];
			const dayName = DAY_NAMES[item.dayOfWeek] ?? `Day ${item.dayOfWeek}`;
			if (!workout) {
				return `- ${dayName} (dayOfWeek=${item.dayOfWeek}) -> workoutIndex=${item.workoutIndex}`;
			}
			return `- ${dayName} (dayOfWeek=${item.dayOfWeek}) -> workoutIndex=${item.workoutIndex}, workoutId=${workout.id}, workoutName="${workout.name}"`;
		})
		.join('\n');
}

function defaultCompletionText(action?: AgentAction): string {
	if (!action) return 'Thanks. I updated the conversation context.';
	if (action.type === 'create_program') return 'Your program is ready. Redirecting you to it now.';
	return 'I updated your program and applied the requested changes.';
}

function chunkTextForStream(text: string, maxChunkLength = 48): string[] {
	if (!text.trim()) return [];
	const words = text.split(/\s+/).filter(Boolean);
	const chunks: string[] = [];
	let current = '';

	for (const word of words) {
		const candidate = current ? `${current} ${word}` : word;
		if (candidate.length > maxChunkLength && current) {
			chunks.push(`${current} `);
			current = word;
			continue;
		}
		current = candidate;
	}

	if (current) {
		chunks.push(current);
	}
	return chunks;
}

interface ChatExecutionOptions {
	streamResponse: boolean;
	onStatus?: (step: string) => void;
	onChunk?: (text: string) => void;
}

async function executeChatRequest(
	authUserId: string,
	apiKey: string,
	messages: Array<{ role: 'user' | 'assistant'; content: string }>,
	conversationType: 'onboarding' | 'reevaluation',
	programId: string | undefined,
	logStep: ReturnType<typeof createStepLogger>,
	options: ChatExecutionOptions
): Promise<AgentTurnResponse> {
	options.onStatus?.('Thinking');

	let systemPrompt =
		conversationType === 'onboarding' ? ONBOARDING_SYSTEM_PROMPT : REEVALUATION_CONVERSATION_PROMPT;

	if (conversationType === 'reevaluation') {
		if (!programId) {
			throw error(400, 'programId is required for reevaluation conversations');
		}

		options.onStatus?.('Checking your program');
		logStep('reevaluation.context.start', { programId });
		const { program, exerciseDetails } = await loadReevaluationContext(authUserId, programId, logStep);
		logStep('reevaluation.context.done', {
			workoutCount: program.workouts.length,
			scheduleDays: program.schedule.weeklyPattern.length,
			hasExerciseDetails: Boolean(exerciseDetails)
		});
		systemPrompt += `\n\nCurrent Program JSON (authoritative context):\n${JSON.stringify(program, null, 2)}`;
		systemPrompt +=
			'\n\nDay Index Mapping (authoritative): 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday';
		systemPrompt += `\n\nCurrent Weekly Schedule (resolved):\n${buildScheduleReference(program)}`;
		if (exerciseDetails) {
			systemPrompt += `\n\nExercise Details:\n${exerciseDetails}`;
		}
	}

	if (!featureFlags.agentToolCalling) {
		options.onStatus?.('Drafting reply');
		if (options.streamResponse) {
			let text = '';
			for await (const chunk of streamMessage(apiKey, messages, systemPrompt)) {
				text += chunk;
				options.onChunk?.(chunk);
			}
			logStep('response.ready', {
				mode: 'text_stream',
				hasAction: false,
				textLength: text.length
			});
			return { text };
		}

		logStep('claude.text_mode.start');
		const text = await sendMessage(apiKey, messages, systemPrompt, logStep);
		logStep('claude.text_mode.done', { textLength: text.length });
		logStep('response.ready', { mode: 'text', hasAction: false, textLength: text.length });
		return { text };
	}

	options.onStatus?.('Thinking');
	const tools = getWorkoutAgentTools({
		authUserId,
		conversationType,
		conversationProgramId: programId,
		logStep
	});
	logStep('tools.ready', {
		toolCount: tools.length,
		toolNames: tools.map((tool) => tool.name)
	});

	options.onStatus?.('Working through details');
	logStep('claude.tool_mode.start');
	const response = await sendMessageWithTools(apiKey, messages, systemPrompt, tools, logStep);
	logStep('claude.tool_mode.done', {
		toolExecutionCount: response.toolExecutions.length,
		textLength: response.text.length
	});

	let action: AgentAction | undefined;
	for (const execution of response.toolExecutions) {
		if (execution.result && isAgentAction(execution.result)) {
			action = execution.result;
		}
	}
	logStep('action.detected', {
		hasAction: Boolean(action),
		actionType: action?.type
	});

	const payload: AgentTurnResponse = {
		text: response.text || defaultCompletionText(action),
		action
	};
	logStep('response.ready', {
		mode: 'tool',
		hasAction: Boolean(action),
		actionType: action?.type,
		textLength: payload.text.length
	});

	if (options.streamResponse) {
		options.onStatus?.('Almost done');
		for (const chunk of chunkTextForStream(payload.text)) {
			options.onChunk?.(chunk);
		}
	}

	return payload;
}

export const POST: RequestHandler = async (event) => {
	const traceId = crypto.randomUUID().slice(0, 8);
	const logStep = createStepLogger(`api/chat:${traceId}`);
	logStep('request.received');

	try {
		const { user } = await requireAuth(event);
		logStep('auth.done', { authUserId: user.id });

		logStep('db.users.api_key.lookup.start');
		const apiKey = await getUserApiKey(user.id);
		logStep('db.users.api_key.lookup.done', { hasApiKey: Boolean(apiKey) });
		if (!apiKey) {
			throw error(400, 'API key is required. Please add your Anthropic API key in Settings.');
		}

		const body = await event.request.json();
		const parsed = chatRequestSchema.safeParse(body);
		if (!parsed.success) {
			throw error(400, 'Invalid chat payload');
		}
		const { messages, conversationType, programId, stream = false } = parsed.data;
		logStep('request.payload.validated', {
			messageCount: messages.length,
			conversationType,
			hasProgramId: Boolean(programId),
			stream
		});

		if (!messages || !Array.isArray(messages)) {
			throw error(400, 'Messages array is required');
		}

		if (!stream) {
			const payload = await executeChatRequest(
				user.id,
				apiKey,
				messages,
				conversationType,
				programId,
				logStep,
				{ streamResponse: false }
			);
			return json(payload);
		}

		const encoder = new TextEncoder();
		const streamResponse = new ReadableStream({
			async start(controller) {
				const sendEvent = (payload: Record<string, unknown>) => {
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
				};

				try {
					const response = await executeChatRequest(
						user.id,
						apiKey,
						messages,
						conversationType,
						programId,
						logStep,
						{
							streamResponse: true,
							onStatus: (step) => sendEvent({ type: 'status', step }),
							onChunk: (text) => sendEvent({ type: 'text', text })
						}
					);

					if (response.action) {
						sendEvent({ type: 'action', action: response.action });
					}

					sendEvent({ type: 'done' });
					controller.enqueue(encoder.encode('data: [DONE]\n\n'));
					controller.close();
				} catch (streamError) {
					const message =
						streamError instanceof Error ? streamError.message : 'Streaming failed';
					logStep('request.failed.stream', { errorMessage: message });
					sendEvent({ type: 'error', error: message });
					controller.enqueue(encoder.encode('data: [DONE]\n\n'));
					controller.close();
				}
			}
		});

		return new Response(streamResponse, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		});
	} catch (caughtError) {
		logAndRethrow(logStep, 'request.failed', caughtError);
	}
};
