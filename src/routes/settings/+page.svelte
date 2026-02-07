<svelte:head>
	<title>Settings | AI Fitness Coach</title>
</svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Card from '$lib/components/shared/Card.svelte';
	import Input from '$lib/components/shared/Input.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import { signOut, getAuthState } from '$lib/stores/auth-store.svelte';
	import { checkApiKeyStatus, saveApiKey } from '$lib/services/ai/api-client';
	import { Moon, Info, Check, LogOut, User, Key, Save } from 'lucide-svelte';

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
</script>

<div class="space-y-6 animate-slideUp">

	<!-- Account -->
	<Card>
		<div class="space-y-4">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-xl bg-brand-soft flex items-center justify-center">
					<User size={20} class="text-brand" />
				</div>
				<div>
					<h2 class="text-base font-semibold text-primary">Account</h2>
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
	<Card variant={hasApiKey && !showUpdateForm ? 'success' : 'warning'}>
		<div class="space-y-4">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-xl bg-warning-soft flex items-center justify-center">
					<Key size={20} class="text-warning" />
				</div>
				<div>
					<h2 class="text-base font-semibold text-primary">Anthropic API Key</h2>
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
						class="text-brand hover:underline font-medium"
					>
						console.anthropic.com
					</a>
				</p>
			</div>

			{#if loading}
				<div class="text-sm text-secondary">Checking API key status...</div>
			{:else if hasApiKey && !showUpdateForm}
				<div class="flex items-center justify-between gap-3 p-4 rounded-xl bg-success-soft border border-success-soft">
					<div class="flex items-center gap-3">
						<Check size={24} class="text-success flex-shrink-0" />
						<div>
							<p class="font-medium text-success">API key configured</p>
							<p class="text-sm text-success/80">Your key is securely stored</p>
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
					<div class="flex items-center gap-2 p-3 rounded-xl bg-success-soft border border-success-soft">
						<Check size={20} class="text-success" />
						<span class="text-sm font-medium text-success">API key configured</span>
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

	<!-- Appearance -->
	<Card variant="info">
		<div class="space-y-4">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-xl bg-brand-soft flex items-center justify-center">
					<Moon size={20} class="text-brand" />
				</div>
				<div>
					<h2 class="text-base font-semibold text-primary">Appearance</h2>
					<p class="text-sm text-secondary">Dark mode is always enabled</p>
				</div>
			</div>
			<div class="flex items-center justify-between rounded-xl border border-theme surface-elevated px-4 py-3">
				<span class="text-sm text-secondary">Theme</span>
				<span class="text-sm font-semibold text-primary">Dark (locked)</span>
			</div>
		</div>
	</Card>

	<!-- About -->
	<Card variant="info">
		<div class="space-y-4">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-xl bg-success-soft flex items-center justify-center">
					<Info size={20} class="text-success" />
				</div>
				<div>
					<h2 class="text-base font-semibold text-primary">About</h2>
					<p class="text-sm text-secondary">AI Fitness Coach v1.0</p>
				</div>
			</div>

			<p class="text-sm text-secondary">
				An AI-powered workout program generator built with SvelteKit and Claude. Create
				personalized fitness programs tailored to your goals, equipment, and schedule.
			</p>

			<div class="flex flex-wrap gap-2">
				<span class="px-3 py-1 text-xs font-medium rounded-full bg-brand-soft text-brand">
					SvelteKit
				</span>
				<span class="px-3 py-1 text-xs font-medium rounded-full bg-warning-soft text-warning">
					Claude AI
				</span>
				<span class="px-3 py-1 text-xs font-medium rounded-full bg-success-soft text-success">
					Tailwind CSS
				</span>
			</div>
		</div>
	</Card>
</div>
