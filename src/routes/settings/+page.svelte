<script lang="ts">
	import { onMount } from 'svelte';
	import Card from '$lib/components/shared/Card.svelte';
	import Input from '$lib/components/shared/Input.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import { themeStore, type Theme } from '$lib/stores/theme-store.svelte';
	import { Save, Sun, Moon, Monitor, Key, Info, Check } from 'lucide-svelte';

	let apiKey = $state('');
	let saved = $state(false);

	onMount(() => {
		// Load API key from localStorage
		const stored = localStorage.getItem('anthropic_api_key');
		if (stored) {
			apiKey = stored;
		}
	});

	function handleSave() {
		if (apiKey.trim()) {
			localStorage.setItem('anthropic_api_key', apiKey.trim());
			saved = true;
			setTimeout(() => {
				saved = false;
			}, 2000);
		}
	}

	const themeOptions: { value: Theme; icon: typeof Sun; label: string }[] = [
		{ value: 'light', icon: Sun, label: 'Light' },
		{ value: 'dark', icon: Moon, label: 'Dark' },
		{ value: 'system', icon: Monitor, label: 'System' }
	];
</script>

<div class="space-y-6 animate-slideUp">
	<h1 class="text-2xl font-bold text-primary">Settings</h1>

	<!-- Theme Selection -->
	<Card>
		<div class="space-y-4">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-xl bg-cyan-500/10 dark:bg-cyan-400/15 flex items-center justify-center">
					{#if themeStore.effectiveTheme === 'dark'}
						<Moon size={20} class="text-cyan-500 dark:text-cyan-400" />
					{:else}
						<Sun size={20} class="text-cyan-500 dark:text-cyan-400" />
					{/if}
				</div>
				<div>
					<h2 class="text-lg font-semibold text-primary">Appearance</h2>
					<p class="text-sm text-secondary">Choose your preferred theme</p>
				</div>
			</div>

			<div class="grid grid-cols-3 gap-3">
				{#each themeOptions as option}
					{@const isActive = themeStore.theme === option.value}
					<button
						onclick={() => themeStore.setTheme(option.value)}
						class="relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 touch-target {isActive
							? 'border-cyan-500 dark:border-cyan-400 bg-cyan-500/5 dark:bg-cyan-400/10'
							: 'border-theme surface hover:border-gray-300 dark:hover:border-slate-500'}"
					>
						{#if isActive}
							<option.icon size={24} class="text-cyan-600 dark:text-cyan-400" />
						{:else}
							<option.icon size={24} class="text-secondary" />
						{/if}
						<span
							class="text-sm font-medium {isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-secondary'}"
						>
							{option.label}
						</span>
						{#if isActive}
							<div
								class="absolute top-2 right-2 w-5 h-5 rounded-full bg-cyan-500 dark:bg-cyan-400 flex items-center justify-center"
							>
								<Check size={12} class="text-white" strokeWidth={3} />
							</div>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	</Card>

	<!-- API Key -->
	<Card>
		<div class="space-y-4">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
					<Key size={20} class="text-orange-500" />
				</div>
				<div>
					<h2 class="text-lg font-semibold text-primary">Anthropic API Key</h2>
					<p class="text-sm text-secondary">Required for AI program generation</p>
				</div>
			</div>

			<div class="p-3 surface-elevated rounded-xl border border-theme">
				<p class="text-sm text-secondary">
					Your API key is stored locally in your browser and is used to generate workout programs.
					Get your API key from
					<a
						href="https://console.anthropic.com"
						target="_blank"
						rel="noopener"
						class="text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
					>
						console.anthropic.com
					</a>
				</p>
			</div>

			<Input bind:value={apiKey} placeholder="sk-ant-..." disabled={false} />

			<Button onclick={handleSave} disabled={!apiKey.trim()} fullWidth>
				{#snippet children()}
					{#if saved}
						<Check size={20} />
						Saved!
					{:else}
						<Save size={20} />
						Save API Key
					{/if}
				{/snippet}
			</Button>
		</div>
	</Card>

	<!-- About -->
	<Card>
		<div class="space-y-4">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
					<Info size={20} class="text-emerald-500" />
				</div>
				<div>
					<h2 class="text-lg font-semibold text-primary">About</h2>
					<p class="text-sm text-secondary">AI Fitness Coach v1.0</p>
				</div>
			</div>

			<p class="text-sm text-secondary">
				An AI-powered workout program generator built with SvelteKit and Claude. Create
				personalized fitness programs tailored to your goals, equipment, and schedule.
			</p>

			<div class="flex flex-wrap gap-2">
				<span class="px-3 py-1 text-xs font-medium rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
					SvelteKit
				</span>
				<span class="px-3 py-1 text-xs font-medium rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
					Claude AI
				</span>
				<span class="px-3 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
					Tailwind CSS
				</span>
			</div>
		</div>
	</Card>
</div>
