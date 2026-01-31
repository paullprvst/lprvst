import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth, getUserApiKey, saveUserApiKey } from '$lib/server/auth';

export const GET: RequestHandler = async (event) => {
	const { user } = await requireAuth(event);
	const apiKey = await getUserApiKey(user.id);
	return json({ hasApiKey: !!apiKey });
};

export const POST: RequestHandler = async (event) => {
	const { user } = await requireAuth(event);

	const body = await event.request.json();
	const { apiKey } = body;

	if (!apiKey || typeof apiKey !== 'string') {
		throw error(400, 'API key is required');
	}

	const success = await saveUserApiKey(user.id, apiKey.trim());

	if (!success) {
		throw error(500, 'Failed to save API key');
	}

	return json({ success: true });
};
