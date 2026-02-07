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

function defaultCompletionText(action?: AgentAction): string {
	if (!action) return 'Thanks. I updated the conversation context.';
	if (action.type === 'create_program') return 'Your program is ready. Redirecting you to it now.';
	return 'I updated your program and applied the requested changes.';
}

export const POST: RequestHandler = async (event) => {
	const { user } = await requireAuth(event);

	const apiKey = await getUserApiKey(user.id);
	if (!apiKey) {
		throw error(400, 'API key is required. Please add your Anthropic API key in Settings.');
	}

	const body = await event.request.json();
	const parsed = chatRequestSchema.safeParse(body);
	if (!parsed.success) {
		throw error(400, 'Invalid chat payload');
	}
	const { messages, conversationType, programId } = parsed.data;

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

		const { program, exerciseDetails } = await loadReevaluationContext(user.id, programId);
		systemPrompt += `\n\nCurrent Program JSON (authoritative context):\n${JSON.stringify(program, null, 2)}`;
		if (exerciseDetails) {
			systemPrompt += `\n\nExercise Details:\n${exerciseDetails}`;
		}
	}

	if (!featureFlags.agentToolCalling) {
		const text = await sendMessage(apiKey, messages, systemPrompt);
		return json({ text } satisfies AgentTurnResponse);
	}

	const tools = getWorkoutAgentTools({
		authUserId: user.id,
		conversationType,
		conversationProgramId: programId
	});
	const response = await sendMessageWithTools(apiKey, messages, systemPrompt, tools);

	let action: AgentAction | undefined;
	for (const execution of response.toolExecutions) {
		if (execution.result && isAgentAction(execution.result)) {
			action = execution.result;
		}
	}

	const payload: AgentTurnResponse = {
		text: response.text || defaultCompletionText(action),
		action
	};
	return json(payload);
};
