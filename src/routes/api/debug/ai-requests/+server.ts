import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { isAiDebugAllowed, listAiDebugLogs } from '$lib/server/ai-debug-log';

export const GET: RequestHandler = async (event) => {
	const { user } = await requireAuth(event);

	if (!isAiDebugAllowed(user.email)) {
		throw error(403, 'Forbidden');
	}

	const limitParam = Number(event.url.searchParams.get('limit') ?? 200);
	const limit = Number.isFinite(limitParam) ? Math.trunc(limitParam) : 200;
	const logs = await listAiDebugLogs(user.id, limit);

	return json({ logs });
};
