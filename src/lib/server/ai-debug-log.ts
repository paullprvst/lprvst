import { createServerClient } from '$lib/server/auth';

const AI_DEBUG_EMAIL = 'paul@lprv.st';

export interface AiDebugLogEntry {
	id: string;
	source: string;
	requestPayload: unknown;
	responsePayload: unknown;
	errorMessage: string | null;
	createdAt: string;
}

interface RecordAiDebugLogInput {
	authUserId: string;
	userEmail?: string | null;
	source: string;
	requestPayload: unknown;
	responsePayload?: unknown;
	errorMessage?: string;
}

export function isAiDebugAllowed(userEmail?: string | null): boolean {
	return (userEmail ?? '').trim().toLowerCase() === AI_DEBUG_EMAIL;
}

export async function recordAiDebugLog(input: RecordAiDebugLogInput): Promise<void> {
	if (!isAiDebugAllowed(input.userEmail)) return;

	try {
		const supabase = createServerClient();
		const { error: insertError } = await supabase.from('ai_debug_logs').insert({
			auth_user_id: input.authUserId,
			source: input.source,
			request_payload: input.requestPayload ?? {},
			response_payload: input.responsePayload ?? null,
			error_message: input.errorMessage ?? null
		});

		if (insertError) {
			console.warn('[ai-debug] Failed to persist AI debug log', {
				source: input.source,
				errorMessage: insertError.message
			});
		}
	} catch (caughtError) {
		console.warn('[ai-debug] Unexpected AI debug log persistence error', {
			source: input.source,
			errorMessage: caughtError instanceof Error ? caughtError.message : String(caughtError)
		});
	}
}

export async function listAiDebugLogs(authUserId: string, limit = 200): Promise<AiDebugLogEntry[]> {
	const supabase = createServerClient();
	const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 500) : 200;
	const { data, error } = await supabase
		.from('ai_debug_logs')
		.select('id, source, request_payload, response_payload, error_message, created_at')
		.eq('auth_user_id', authUserId)
		.order('created_at', { ascending: false })
		.limit(safeLimit);

	if (error) {
		console.error('[ai-debug] Failed to load AI debug logs', {
			errorMessage: error.message
		});
		return [];
	}

	return (data ?? []).map((row) => ({
		id: String(row.id),
		source: String(row.source),
		requestPayload: row.request_payload,
		responsePayload: row.response_payload,
		errorMessage: row.error_message ? String(row.error_message) : null,
		createdAt: String(row.created_at)
	}));
}
