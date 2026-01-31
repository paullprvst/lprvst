import { createClient, type User, type Session } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
	auth: {
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: true
	}
});

// Auth helper functions
export async function signUp(
	email: string,
	password: string
): Promise<{ user: User | null; error: Error | null }> {
	const { data, error } = await supabase.auth.signUp({
		email,
		password
	});

	if (error) {
		return { user: null, error };
	}

	return { user: data.user, error: null };
}

export async function signIn(
	email: string,
	password: string
): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
	const { data, error } = await supabase.auth.signInWithPassword({
		email,
		password
	});

	if (error) {
		return { user: null, session: null, error };
	}

	return { user: data.user, session: data.session, error: null };
}

export async function signOut(): Promise<{ error: Error | null }> {
	const { error } = await supabase.auth.signOut();
	return { error };
}

export async function getSession(): Promise<Session | null> {
	const { data } = await supabase.auth.getSession();
	return data.session;
}

export async function getUser(): Promise<User | null> {
	const { data } = await supabase.auth.getUser();
	return data.user;
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
	const {
		data: { subscription }
	} = supabase.auth.onAuthStateChange((event, session) => {
		callback(session);
	});

	return subscription;
}
