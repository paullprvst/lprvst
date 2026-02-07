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

<div class="min-h-screen flex flex-col relative overflow-x-clip">
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
		class="relative z-10 flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 {auth.isAuthenticated && !isAuthRoute && !isWorkoutRoute
			? 'pb-32'
			: 'pb-10'}"
	>
		{@render children()}
	</main>

	<!-- Bottom Navigation -->
	{#if auth.isAuthenticated && !isAuthRoute && !isWorkoutRoute}
		<nav
			class="fixed bottom-0 left-0 right-0 z-[100] safe-area-inset-bottom px-3 pb-2 sm:px-4"
			aria-label="Primary navigation"
		>
			<div
				class="mx-auto max-w-4xl rounded-[1.3rem] border border-[rgb(var(--color-border)/0.7)] glass-heavy shadow-[0_18px_36px_-20px_rgb(2_7_14/0.92)]"
			>
				<div class="grid grid-cols-5">
					{#each navItems as item, index}
						{@const isActive = index === activeIndex}
						<a
							href={item.href}
							aria-label={item.label}
							class="group relative flex items-center justify-center py-2.5 sm:py-3 transition-all duration-200"
						>
							<span
								class="flex min-w-[60px] flex-col items-center gap-1 rounded-xl px-2.5 py-1.5 transition-all duration-200 {isActive
									? 'text-brand bg-brand-soft shadow-[0_10px_24px_-16px_rgb(var(--color-primary)/0.85)]'
									: 'text-secondary group-hover:text-primary group-hover:bg-[rgb(var(--color-border)/0.28)]'}"
							>
								<item.icon size={19} strokeWidth={isActive ? 2.5 : 2} />
								<span
									class="text-[10px] sm:text-[11px] tracking-[0.02em] font-semibold leading-none"
								>
									{item.label}
								</span>
							</span>
						</a>
					{/each}
				</div>
			</div>
		</nav>
	{/if}
</div>
