<svelte:head>
	<title>Settings | AI Fitness Coach</title>
</svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Card from '$lib/components/shared/Card.svelte';
	import Input from '$lib/components/shared/Input.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import { themeStore, type Theme } from '$lib/stores/theme-store.svelte';
	import { signOut, getAuthState } from '$lib/stores/auth-store.svelte';
	import { checkApiKeyStatus, saveApiKey } from '$lib/services/ai/api-client';
	import { Sun, Moon, Monitor, Info, Check, LogOut, User, Key, Save } from 'lucide-svelte';

	const auth = getAuthState();
	let signingOut = $state(false);
	let apiKey = $state('');
	let hasApiKey = $state(false);
	let saving = $state(false);
	let saved = $state(false);
	let loading = $state(true);
	let showUpdateForm = $state(false);

	onMount(() => {
		// Wait for auth to be initialized before checking API key
		const checkWhenReady = async () => {
			if (!auth.initialized) {
				setTimeout(checkWhenReady, 50);
				return;
			}
			if (auth.isAuthenticated) {
				hasApiKey = await checkApiKeyStatus();
			}
			loading = false;
		};
		checkWhenReady();
	});

	async function handleSaveApiKey() {
		if (!apiKey.trim()) return;

		saving = true;
		const success = await saveApiKey(apiKey.trim());
		saving = false;

		if (success) {
			hasApiKey = true;
			apiKey = '';
			showUpdateForm = false;
			saved = true;
			setTimeout(() => {
				saved = false;
			}, 2000);
		}
	}

	async function handleSignOut() {
		signingOut = true;
		const { error } = await signOut();
		if (!error) {
			goto('/login');
		}
		signingOut = false;
	}

	const themeOptions: { value: Theme; icon: typeof Sun; label: string }[] = [
		{ value: 'light', icon: Sun, label: 'Light' },
		{ value: 'dark', icon: Moon, label: 'Dark' },
		{ value: 'system', icon: Monitor, label: 'System' }
	];
</script>

<div class="space-y-6 animate-slideUp">
	<h1 class="text-2xl font-bold text-primary">Settings</h1>

	<!-- Account -->
	<Card>
		<div class="space-y-4">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-xl bg-cyan-500/10 dark:bg-cyan-400/15 flex items-center justify-center">
					<User size={20} class="text-cyan-500 dark:text-cyan-400" />
				</div>
				<div>
					<h2 class="text-lg font-semibold text-primary">Account</h2>
					<p class="text-sm text-secondary">{auth.user?.email || 'Not signed in'}</p>
				</div>
			</div>

			<Button onclick={handleSignOut} disabled={signingOut} variant="secondary" fullWidth>
				{#snippet children()}
					<LogOut size={20} />
					{signingOut ? 'Signing out...' : 'Sign Out'}
				{/snippet}
			</Button>
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
					Your API key is stored securely on the server and synced across all your devices. Get your API key from
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

			{#if loading}
				<div class="text-sm text-secondary">Checking API key status...</div>
			{:else if hasApiKey && !showUpdateForm}
				<div class="flex items-center justify-between gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
					<div class="flex items-center gap-3">
						<Check size={24} class="text-emerald-500 flex-shrink-0" />
						<div>
							<p class="font-medium text-emerald-600 dark:text-emerald-400">API key configured</p>
							<p class="text-sm text-emerald-600/70 dark:text-emerald-400/70">Your key is securely stored</p>
						</div>
					</div>
					<Button onclick={() => showUpdateForm = true} variant="secondary">
						{#snippet children()}
							Change
						{/snippet}
					</Button>
				</div>
			{:else}
				{#if hasApiKey}
					<div class="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
						<Check size={20} class="text-emerald-500" />
						<span class="text-sm font-medium text-emerald-600 dark:text-emerald-400">API key configured</span>
					</div>
					<p class="text-sm text-muted">Enter a new key to replace the existing one:</p>
				{/if}

				<Input bind:value={apiKey} placeholder="sk-ant-..." disabled={saving} />

				<div class="flex gap-3">
					{#if hasApiKey}
						<Button onclick={() => { showUpdateForm = false; apiKey = ''; }} variant="secondary">
							{#snippet children()}
								Cancel
							{/snippet}
						</Button>
					{/if}
					<Button onclick={handleSaveApiKey} disabled={!apiKey.trim() || saving} fullWidth>
						{#snippet children()}
							{#if saved}
								<Check size={20} />
								Saved!
							{:else if saving}
								Saving...
							{:else}
								<Save size={20} />
								{hasApiKey ? 'Update API Key' : 'Save API Key'}
							{/if}
						{/snippet}
					</Button>
				</div>
			{/if}
		</div>
	</Card>

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
