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
