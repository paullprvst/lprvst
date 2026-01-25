<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { Home, Calendar, History, Settings } from 'lucide-svelte';
	import { themeStore } from '$lib/stores/theme-store.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const navItems = [
		{ href: '/', icon: Home, label: 'Home' },
		{ href: '/calendar', icon: Calendar, label: 'Calendar' },
		{ href: '/history', icon: History, label: 'History' },
		{ href: '/settings', icon: Settings, label: 'Settings' }
	];

	let scrolled = $state(false);

	function handleScroll() {
		scrolled = window.scrollY > 10;
	}

	// Get active index for indicator positioning
	const activeIndex = $derived(
		navItems.findIndex((item) => {
			if (item.href === '/') {
				return $page.url.pathname === '/';
			}
			return $page.url.pathname.startsWith(item.href);
		})
	);
</script>

<svelte:window onscroll={handleScroll} />

<div class="min-h-screen flex flex-col">
	<!-- Header with backdrop blur on scroll -->
	<header
		class="sticky top-0 z-[100] transition-all duration-200"
		class:glass-heavy={scrolled}
		class:surface={!scrolled}
		class:shadow-sm={scrolled}
	>
		<div class="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
			<h1 class="text-xl sm:text-2xl font-bold text-primary">AI Fitness Coach</h1>
		</div>
	</header>

	<!-- Main Content -->
	<main class="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6 pb-28">
		{@render children()}
	</main>

	<!-- Bottom Navigation with glass morphism and sliding indicator -->
	<nav
		class="fixed bottom-0 left-0 right-0 z-[100] glass-heavy border-t border-theme safe-area-inset-bottom"
	>
		<div class="max-w-7xl mx-auto px-4">
			<div class="relative flex justify-around">
				<!-- Sliding indicator -->
				{#if activeIndex >= 0}
					<div
						class="absolute top-0 h-0.5 bg-blue-500 rounded-full transition-all duration-300 ease-out"
						style="width: {100 / navItems.length}%; left: {(activeIndex * 100) /
							navItems.length}%;"
					></div>
				{/if}

				{#each navItems as item, index}
					{@const isActive = index === activeIndex}
					<a
						href={item.href}
						class="relative flex flex-col items-center py-3 px-4 touch-target transition-all duration-200 group {isActive
							? 'text-blue-500'
							: 'text-secondary'}"
					>
						<div
							class="p-1.5 rounded-xl transition-all duration-200 {isActive
								? 'bg-blue-500/10'
								: 'group-hover:bg-gray-500/10'}"
						>
							<item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
						</div>
						<span
							class="text-xs mt-1 transition-all duration-200 {isActive
								? 'font-semibold'
								: 'font-medium'}"
						>
							{item.label}
						</span>
					</a>
				{/each}
			</div>
		</div>
	</nav>
</div>
