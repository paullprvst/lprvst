<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	onMount(async () => {
		if (browser) {
			const { registerSW } = await import('virtual:pwa-register');
			registerSW({
				immediate: true
			});
		}
	});
</script>

<main>
		{@render children()}
</main>
