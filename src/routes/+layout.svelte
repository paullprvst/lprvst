<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { Dumbbell, Calendar, History, Settings, Scale } from 'lucide-svelte';
	import { themeStore } from '$lib/stores/theme-store.svelte';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { initializeAuth, getAuthState } from '$lib/stores/auth-store.svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const auth = getAuthState();

	onMount(async () => {
		// Initialize auth state
		await initializeAuth();

		if (browser) {
			const { registerSW } = await import('virtual:pwa-register');
			registerSW({
				immediate: true,
				onRegistered(registration) {
					console.log('SW registered:', registration);
				},
				onRegisterError(error) {
					console.error('SW registration error:', error);
				}
			});
		}
	});

	const navItems = [
		{ href: '/calendar', icon: Calendar, label: 'Calendar' },
		{ href: '/programs', icon: Dumbbell, label: 'Workouts' },
		{ href: '/body', icon: Scale, label: 'Body' },
		{ href: '/history', icon: History, label: 'History' },
		{ href: '/settings', icon: Settings, label: 'Settings' }
	];

	// Get active index for indicator positioning
	const activeIndex = $derived(
		navItems.findIndex((item) => {
			return $page.url.pathname.startsWith(item.href);
		})
	);

	// Check if current route is a public/auth route (no navigation needed)
	const isAuthRoute = $derived(
		$page.url.pathname === '/login' || $page.url.pathname === '/signup'
	);

	// Check if current route is an active workout (hide nav bar)
	const isWorkoutRoute = $derived($page.url.pathname.startsWith('/workout/'));
</script>

<div class="min-h-screen flex flex-col">
	<!-- Main Content -->
	<main class="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-4 pt-4 sm:pt-6 {auth.isAuthenticated && !isAuthRoute && !isWorkoutRoute ? 'pb-32' : 'pb-8'}">
		{@render children()}
	</main>

	<!-- Bottom Navigation with glass morphism (only show for authenticated users on non-auth/non-workout routes) -->
	{#if auth.isAuthenticated && !isAuthRoute && !isWorkoutRoute}
		<nav
			class="fixed bottom-0 left-0 right-0 z-[100] glass-heavy border-t border-theme safe-area-inset-bottom"
		>
			<div class="flex">
				{#each navItems as item, index}
					{@const isActive = index === activeIndex}
					<a
						href={item.href}
						class="flex-1 flex items-center justify-center py-4 transition-all duration-200 {isActive
							? 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10'
							: 'text-secondary active:bg-gray-500/10'}"
					>
						<item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
					</a>
				{/each}
			</div>
		</nav>
	{/if}
</div>
