<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { Home, Calendar, History, Settings } from 'lucide-svelte';

	const navItems = [
		{ href: '/', icon: Home, label: 'Home' },
		{ href: '/calendar', icon: Calendar, label: 'Calendar' },
		{ href: '/history', icon: History, label: 'History' },
		{ href: '/settings', icon: Settings, label: 'Settings' }
	];
</script>

<div class="min-h-screen flex flex-col">
	<header class="bg-white shadow-sm sticky top-0 z-10">
		<div class="max-w-7xl mx-auto px-4 py-4">
			<h1 class="text-2xl font-bold text-gray-900">AI Fitness Coach</h1>
		</div>
	</header>

	<main class="flex-1 max-w-7xl mx-auto w-full px-4 py-6 pb-20">
		<slot />
	</main>

	<nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom">
		<div class="max-w-7xl mx-auto px-4">
			<div class="flex justify-around">
				{#each navItems as item}
					<a
						href={item.href}
						class="flex flex-col items-center py-3 px-2 touch-target transition-colors"
						class:text-blue-600={$page.url.pathname === item.href}
						class:text-gray-600={$page.url.pathname !== item.href}
					>
						<svelte:component this={item.icon} size={24} />
						<span class="text-xs mt-1">{item.label}</span>
					</a>
				{/each}
			</div>
		</div>
	</nav>
</div>
