import type { User, Session } from '@supabase/supabase-js';
import {
	supabase,
	signIn as supabaseSignIn,
	signUp as supabaseSignUp,
	signOut as supabaseSignOut,
	getSession as supabaseGetSession,
	onAuthStateChange
} from '$lib/services/storage/supabase';
import { themeStore } from './theme-store.svelte';
import { clearTabCache } from '$lib/services/tab-cache';

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

// Ensure user profile exists in the users table
async function ensureUserProfile(authUserId: string) {
	// Check if profile exists
	const { data: existing } = await supabase
		.from('users')
		.select('id')
		.eq('auth_user_id', authUserId)
		.single();

	if (!existing) {
		// Create profile with defaults
		await supabase.from('users').insert({
			auth_user_id: authUserId,
			objectives: '',
			profile: {
				fitnessLevel: 'beginner',
				availableEquipment: [],
				schedule: {
					daysPerWeek: 3
				}
			}
		});
	}
}

// Initialize auth state
export async function initializeAuth() {
	if (state.initialized) return;

	state.loading = true;

	try {
		const session = await supabaseGetSession();
		state.session = session;
		state.user = session?.user ?? null;

		// Ensure profile exists for authenticated users
		if (session?.user) {
			await ensureUserProfile(session.user.id);
			await themeStore.syncFromServer();
		}
	} catch (err) {
		console.error('Failed to get session:', err);
	} finally {
		state.loading = false;
		state.initialized = true;
	}

	// Subscribe to auth state changes
	onAuthStateChange(async (session) => {
		const previousAuthUserId = state.user?.id ?? null;
		const nextAuthUserId = session?.user?.id ?? null;

		state.session = session;
		state.user = session?.user ?? null;

		if (previousAuthUserId !== nextAuthUserId) {
			clearAppUserIdCache();
			clearTabCache();
		}

		// Ensure profile exists when user logs in
		if (session?.user) {
			await ensureUserProfile(session.user.id);
			await themeStore.syncFromServer();
		}
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

		// Ensure profile exists
		if (user) {
			await ensureUserProfile(user.id);
			await themeStore.syncFromServer();
		}

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
			clearAppUserIdCache();
			clearTabCache();
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

// Get current auth user ID (from Supabase Auth)
export function getAuthUserId(): string | null {
	return state.user?.id ?? null;
}

// Get current app user ID (from users table)
// This requires a database lookup, so it's async
let cachedAppUserId: string | null = null;

export async function getAppUserId(): Promise<string | null> {
	const authId = state.user?.id;
	if (!authId) return null;

	if (cachedAppUserId) return cachedAppUserId;

	const { supabase } = await import('$lib/services/storage/supabase');
	const { data } = await supabase
		.from('users')
		.select('id')
		.eq('auth_user_id', authId)
		.single();

	cachedAppUserId = data?.id ?? null;
	return cachedAppUserId;
}

// Clear cached app user ID (call on sign out)
function clearAppUserIdCache() {
	cachedAppUserId = null;
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
