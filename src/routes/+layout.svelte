<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { Dumbbell, Calendar, History, Settings, Scale } from 'lucide-svelte';
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
	<main
		class="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 {auth.isAuthenticated && !isAuthRoute && !isWorkoutRoute
			? 'pb-28'
			: 'pb-8'}"
	>
		{@render children()}
	</main>

	<!-- Bottom Navigation with glass morphism (only show for authenticated users on non-auth/non-workout routes) -->
	{#if auth.isAuthenticated && !isAuthRoute && !isWorkoutRoute}
		<nav
			class="fixed bottom-0 left-0 right-0 z-[100] glass-heavy border-t border-theme safe-area-inset-bottom"
			aria-label="Primary navigation"
		>
			<div class="flex">
				{#each navItems as item, index}
					{@const isActive = index === activeIndex}
					<a
						href={item.href}
						aria-label={item.label}
						class="flex-1 flex items-center justify-center py-2.5 transition-all duration-200 border-t-2 {isActive
							? 'text-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary)/0.12)] border-[rgb(var(--color-primary))]'
							: 'text-secondary border-transparent hover:text-primary active:bg-[rgb(var(--color-border)/0.35)]'}"
					>
						<span class="flex flex-col items-center gap-1">
							<item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
							<span class="text-[11px] font-medium leading-none">{item.label}</span>
						</span>
					</a>
				{/each}
			</div>
		</nav>
	{/if}
</div>
