<script lang="ts">
	import { onMount } from 'svelte';
	import Card from '$lib/components/shared/Card.svelte';
	import Input from '$lib/components/shared/Input.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import { Save } from 'lucide-svelte';

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
</script>

<div class="space-y-6">
	<h1 class="text-2xl font-bold">Settings</h1>

	<Card>
		<div class="space-y-4">
			<div>
				<h2 class="text-lg font-semibold mb-2">Anthropic API Key</h2>
				<p class="text-sm text-gray-600 mb-4">
					Your API key is stored locally in your browser and is used to generate workout programs.
					Get your API key from <a href="https://console.anthropic.com" target="_blank" rel="noopener" class="text-blue-600 hover:underline">console.anthropic.com</a>
				</p>
			</div>

			<Input
				bind:value={apiKey}
				placeholder="sk-ant-..."
				disabled={false}
			/>

			<Button onclick={handleSave} disabled={!apiKey.trim()}>
				{#snippet children()}
					<Save size={20} />
					{saved ? 'Saved!' : 'Save API Key'}
				{/snippet}
			</Button>
		</div>
	</Card>

	<Card>
		<div class="space-y-2">
			<h2 class="text-lg font-semibold">About</h2>
			<p class="text-sm text-gray-600">
				AI Fitness Coach v1.0
			</p>
			<p class="text-sm text-gray-600">
				An AI-powered workout program generator built with SvelteKit and Claude.
			</p>
		</div>
	</Card>
</div>
