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

	const bottomNavHeightPx = 64;
	const bottomNavIconSizePx = 20.9;

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
	const showBottomNav = $derived(auth.isAuthenticated && !isAuthRoute && !isWorkoutRoute);
	const mainPaddingBottom = $derived(
		showBottomNav
			? `calc(${bottomNavHeightPx}px + env(safe-area-inset-bottom, 0px) + 0.75rem)`
			: '2.5rem'
	);
</script>

<div class="min-h-dvh flex flex-col">
	<div class="pointer-events-none fixed inset-0 -z-10">
		<div
			class="absolute -top-24 left-[10%] h-64 w-64 rounded-full blur-3xl bg-[rgb(var(--color-primary)/0.22)]"
		></div>
		<div
			class="absolute top-[28%] -right-20 h-72 w-72 rounded-full blur-3xl bg-[rgb(var(--color-accent-secondary)/0.12)]"
		></div>
		<div
			class="absolute -bottom-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl bg-[rgb(var(--color-primary)/0.12)]"
		></div>
	</div>

	<!-- Main Content -->
	<main
		class="relative z-10 flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7"
		style:padding-bottom={mainPaddingBottom}
	>
		{@render children()}
	</main>

	<!-- Bottom Navigation -->
	{#if showBottomNav}
		<nav
			class="fixed bottom-0 left-0 right-0 z-[100] safe-area-inset-bottom bg-[rgb(var(--color-bg)/0.98)] border-t border-[rgb(var(--color-border)/0.82)] shadow-[0_-14px_30px_-18px_rgb(2_7_14/0.98)] backdrop-blur-xl"
			aria-label="Primary navigation"
		>
			<div class="grid grid-cols-5 h-[64px]">
				{#each navItems as item, index}
					{@const isActive = index === activeIndex}
					<a
						href={item.href}
						aria-label={item.label}
						class="group relative flex h-full items-center justify-center transition-all duration-200 {isActive
							? 'text-brand bg-brand-soft'
							: 'text-secondary hover:text-primary hover:bg-[rgb(var(--color-border)/0.22)]'}"
					>
						<item.icon size={bottomNavIconSizePx} strokeWidth={isActive ? 2.5 : 2} />
					</a>
				{/each}
			</div>
		</nav>
	{/if}
</div>
