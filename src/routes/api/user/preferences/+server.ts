import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth, getUserPreferences, saveUserPreferences } from '$lib/server/auth';

export const GET: RequestHandler = async (event) => {
	const { user } = await requireAuth(event);
	const preferences = await getUserPreferences(user.id);
	return json({ preferences: preferences ?? {} });
};

export const PATCH: RequestHandler = async (event) => {
	const { user } = await requireAuth(event);

	const body = await event.request.json();

	if (!body || typeof body !== 'object') {
		throw error(400, 'Preferences object is required');
	}

	const success = await saveUserPreferences(user.id, body);

	if (!success) {
		throw error(500, 'Failed to save preferences');
	}

	return json({ success: true });
};
