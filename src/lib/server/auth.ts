import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SECRET_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { RequestEvent } from '@sveltejs/kit';

// Server-side Supabase client with secret key for admin operations
export function createServerClient() {
	return createClient(PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
}

// Get user session from request
export async function getSession(event: RequestEvent) {
	const authHeader = event.request.headers.get('Authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		return null;
	}

	const token = authHeader.slice(7);
	const supabase = createServerClient();

	const { data: { user }, error } = await supabase.auth.getUser(token);

	if (error || !user) {
		return null;
	}

	return { user, token };
}

// Require authenticated user - throws 401 if not authenticated
export async function requireAuth(event: RequestEvent) {
	const session = await getSession(event);
	if (!session) {
		throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}
	return session;
}

// Get API key for authenticated user from database
export async function getUserApiKey(authUserId: string): Promise<string | null> {
	const supabase = createServerClient();
	const { data, error } = await supabase
		.from('users')
		.select('api_key')
		.eq('auth_user_id', authUserId)
		.single();

	if (error || !data) {
		return null;
	}

	return data.api_key;
}

// Save API key for authenticated user to database
export async function saveUserApiKey(authUserId: string, apiKey: string): Promise<boolean> {
	const supabase = createServerClient();
	const { error } = await supabase
		.from('users')
		.update({ api_key: apiKey })
		.eq('auth_user_id', authUserId);

	return !error;
}
