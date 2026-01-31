import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { browser } from '$app/environment';
import { getSession } from '$lib/services/storage/supabase';

export const load: LayoutLoad = async ({ url }) => {
	// Only run auth checks in browser
	if (!browser) {
		return { session: null };
	}

	const session = await getSession();

	const publicRoutes = ['/login', '/signup'];
	const isPublicRoute = publicRoutes.includes(url.pathname);

	// Redirect unauthenticated users to login (except for public routes)
	if (!session && !isPublicRoute) {
		throw redirect(303, '/login');
	}

	// Redirect authenticated users away from auth pages
	if (session && isPublicRoute) {
		throw redirect(303, '/calendar');
	}

	return { session };
};
