<svelte:head>
	<title>AI Debug Logs | AI Fitness Coach</title>
</svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Card from '$lib/components/shared/Card.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import { getAuthState, getAuthToken } from '$lib/stores/auth-store.svelte';

	interface AiDebugLog {
		id: string;
		source: string;
		requestPayload: unknown;
		responsePayload: unknown;
		errorMessage: string | null;
		createdAt: string;
	}

	const auth = getAuthState();
	const debugEmail = 'paul@lprv.st';
	let logs = $state<AiDebugLog[]>([]);
	let loading = $state(true);
	let refreshing = $state(false);
	let errorMessage = $state('');

	function isAllowedEmail(email?: string | null): boolean {
		return (email ?? '').trim().toLowerCase() === debugEmail;
	}

	function formatTimestamp(value: string): string {
		return new Date(value).toLocaleString();
	}

	function formatJson(value: unknown): string {
		if (value === null || value === undefined) return 'null';
		try {
			return JSON.stringify(value, null, 2);
		} catch {
			return String(value);
		}
	}

	async function loadLogs(showLoadingState: boolean): Promise<void> {
		if (showLoadingState) {
			loading = true;
		} else {
			refreshing = true;
		}
		errorMessage = '';

		try {
			const token = await getAuthToken();
			const headers: HeadersInit = token
				? {
						Authorization: `Bearer ${token}`
					}
				: {};
			const response = await fetch('/api/debug/ai-requests?limit=200', { headers });

			if (response.status === 403) {
				await goto('/calendar');
				return;
			}

			if (!response.ok) {
				const payload = await response.json().catch(() => ({ error: 'Failed to load logs' }));
				throw new Error(payload.error ?? `HTTP ${response.status}`);
			}

			const payload = (await response.json()) as { logs?: AiDebugLog[] };
			logs = payload.logs ?? [];
		} catch (caughtError) {
			errorMessage =
				caughtError instanceof Error ? caughtError.message : 'Failed to load debug logs';
		} finally {
			loading = false;
			refreshing = false;
		}
	}

	onMount(() => {
		const boot = async () => {
			if (!auth.initialized) {
				setTimeout(boot, 50);
				return;
			}

			if (!auth.isAuthenticated) {
				await goto('/login');
				return;
			}

			if (!isAllowedEmail(auth.user?.email)) {
				await goto('/calendar');
				return;
			}

			await loadLogs(true);
		};

		void boot();
	});
</script>

<div class="space-y-6 animate-slideUp">
	<div class="flex items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-primary">AI Debug Logs</h1>
			<p class="text-sm text-secondary mt-1">Raw request and response payload history.</p>
		</div>
		<Button onclick={() => void loadLogs(false)} disabled={loading || refreshing}>
			{#snippet children()}
				{refreshing ? 'Refreshing...' : 'Refresh'}
			{/snippet}
		</Button>
	</div>

	{#if loading}
		<Card>
			<p class="text-sm text-secondary">Loading debug logs...</p>
		</Card>
	{:else if errorMessage}
		<Card variant="warning">
			<p class="text-sm text-warning">{errorMessage}</p>
		</Card>
	{:else if logs.length === 0}
		<Card>
			<p class="text-sm text-secondary">No AI requests logged yet.</p>
		</Card>
	{:else}
		<div class="space-y-4">
			{#each logs as log}
				<Card>
					<div class="space-y-3">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<div class="text-sm font-semibold text-primary">{log.source}</div>
							<div class="text-xs text-muted">{formatTimestamp(log.createdAt)}</div>
						</div>

						{#if log.errorMessage}
							<div class="rounded-xl border border-[rgb(var(--color-error)/0.45)] bg-[rgb(var(--color-error)/0.14)] px-3 py-2">
								<p class="text-xs font-semibold text-[rgb(var(--color-error))]">Request error</p>
								<p class="text-sm text-[rgb(var(--color-error))] whitespace-pre-wrap">{log.errorMessage}</p>
							</div>
						{/if}

						<div class="space-y-2">
							<h2 class="text-xs font-semibold uppercase tracking-wide text-muted">Request payload</h2>
							<pre class="max-h-80 overflow-auto rounded-xl border border-theme bg-[rgb(var(--color-surface-elevated))] p-3 text-xs text-primary whitespace-pre-wrap break-words">{formatJson(log.requestPayload)}</pre>
						</div>

						<div class="space-y-2">
							<h2 class="text-xs font-semibold uppercase tracking-wide text-muted">Response payload</h2>
							<pre class="max-h-96 overflow-auto rounded-xl border border-theme bg-[rgb(var(--color-surface-elevated))] p-3 text-xs text-primary whitespace-pre-wrap break-words">{formatJson(log.responsePayload)}</pre>
						</div>
					</div>
				</Card>
			{/each}
		</div>
	{/if}
</div>
