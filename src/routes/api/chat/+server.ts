import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendMessage, sendMessageWithTools } from '$lib/server/claude-client';
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
		const { messages, conversationType, programId } = parsed.data;
		logStep('request.payload.validated', {
			messageCount: messages.length,
			conversationType,
			hasProgramId: Boolean(programId)
		});

		if (!messages || !Array.isArray(messages)) {
			throw error(400, 'Messages array is required');
		}

		let systemPrompt =
			conversationType === 'onboarding'
				? ONBOARDING_SYSTEM_PROMPT
				: REEVALUATION_CONVERSATION_PROMPT;

		if (conversationType === 'reevaluation') {
			if (!programId) {
				throw error(400, 'programId is required for reevaluation conversations');
			}

			logStep('reevaluation.context.start', { programId });
			const { program, exerciseDetails } = await loadReevaluationContext(user.id, programId, logStep);
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
			logStep('claude.text_mode.start');
			const text = await sendMessage(apiKey, messages, systemPrompt, logStep);
			logStep('claude.text_mode.done', { textLength: text.length });
			logStep('response.ready', { mode: 'text', hasAction: false, textLength: text.length });
			return json({ text } satisfies AgentTurnResponse);
		}

		const tools = getWorkoutAgentTools({
			authUserId: user.id,
			conversationType,
			conversationProgramId: programId,
			logStep
		});
		logStep('tools.ready', {
			toolCount: tools.length,
			toolNames: tools.map((tool) => tool.name)
		});

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
		return json(payload);
	} catch (caughtError) {
		logAndRethrow(logStep, 'request.failed', caughtError);
	}
};
