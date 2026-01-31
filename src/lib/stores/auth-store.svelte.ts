import type { User, Session } from '@supabase/supabase-js';
import {
	signIn as supabaseSignIn,
	signUp as supabaseSignUp,
	signOut as supabaseSignOut,
	getSession as supabaseGetSession,
	onAuthStateChange
} from '$lib/services/storage/supabase';

interface AuthState {
	user: User | null;
	session: Session | null;
	loading: boolean;
	initialized: boolean;
}

let state = $state<AuthState>({
	user: null,
	session: null,
	loading: true,
	initialized: false
});

// Initialize auth state
export async function initializeAuth() {
	if (state.initialized) return;

	state.loading = true;

	try {
		const session = await supabaseGetSession();
		state.session = session;
		state.user = session?.user ?? null;
	} catch (err) {
		console.error('Failed to get session:', err);
	} finally {
		state.loading = false;
		state.initialized = true;
	}

	// Subscribe to auth state changes
	onAuthStateChange((session) => {
		state.session = session;
		state.user = session?.user ?? null;
	});
}

// Sign in with email/password
export async function signIn(email: string, password: string): Promise<{ error: Error | null }> {
	state.loading = true;

	try {
		const { user, session, error } = await supabaseSignIn(email, password);

		if (error) {
			return { error };
		}

		state.user = user;
		state.session = session;
		return { error: null };
	} finally {
		state.loading = false;
	}
}

// Sign up with email/password
export async function signUp(email: string, password: string): Promise<{ error: Error | null }> {
	state.loading = true;

	try {
		const { user, error } = await supabaseSignUp(email, password);

		if (error) {
			return { error };
		}

		// Note: User may need to confirm email before session is created
		if (user) {
			state.user = user;
		}
		return { error: null };
	} finally {
		state.loading = false;
	}
}

// Sign out
export async function signOut(): Promise<{ error: Error | null }> {
	state.loading = true;

	try {
		const { error } = await supabaseSignOut();

		if (!error) {
			state.user = null;
			state.session = null;
		}

		return { error };
	} finally {
		state.loading = false;
	}
}

// Get current auth token for API requests
export async function getAuthToken(): Promise<string | null> {
	return state.session?.access_token ?? null;
}

// Get current user ID
export function getUserId(): string | null {
	return state.user?.id ?? null;
}

// Reactive getters
export function getAuthState() {
	return {
		get user() {
			return state.user;
		},
		get session() {
			return state.session;
		},
		get loading() {
			return state.loading;
		},
		get initialized() {
			return state.initialized;
		},
		get isAuthenticated() {
			return !!state.session;
		}
	};
}
