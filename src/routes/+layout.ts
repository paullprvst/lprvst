import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { browser } from '$app/environment';
import { getSession, supabase } from '$lib/services/storage/supabase';

export const load: LayoutLoad = async ({ url }) => {
	// Only run auth checks in browser
	if (!browser) {
		return { session: null, onboardingComplete: false };
	}

	const session = await getSession();

	const publicRoutes = ['/login', '/signup'];
	const isPublicRoute = publicRoutes.includes(url.pathname);
	const isOnboarding = url.pathname === '/onboarding';

	// Redirect unauthenticated users to login (except for public routes)
	if (!session && !isPublicRoute) {
		throw redirect(303, '/login');
	}

	// Redirect authenticated users away from auth pages
	if (session && isPublicRoute) {
		throw redirect(303, '/calendar');
	}

	// Check if user has completed onboarding (has objectives set)
	let onboardingComplete = false;
	if (session) {
		const { data } = await supabase
			.from('users')
			.select('objectives')
			.eq('auth_user_id', session.user.id)
			.single();

		onboardingComplete = !!data?.objectives;

		// Redirect users who haven't completed onboarding (unless already there)
		if (!onboardingComplete && !isOnboarding && !isPublicRoute) {
			throw redirect(303, '/onboarding');
		}
	}

	return { session, onboardingComplete };
};
