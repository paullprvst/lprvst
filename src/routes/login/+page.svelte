<svelte:head>
	<title>Sign In | AI Fitness Coach</title>
</svelte:head>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { signIn, getAuthState } from '$lib/stores/auth-store.svelte';
	import Card from '$lib/components/shared/Card.svelte';
	import Input from '$lib/components/shared/Input.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import AlertBanner from '$lib/components/shared/AlertBanner.svelte';
	import { Sparkles, ShieldCheck } from 'lucide-svelte';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	const auth = getAuthState();

	// Redirect if already authenticated
	$effect(() => {
		if (auth.isAuthenticated) {
			goto('/calendar');
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;

		const result = await signIn(email, password);

		if (result.error) {
			error = result.error.message;
			loading = false;
		} else {
			goto('/calendar');
		}
	}
</script>

<div class="min-h-[80vh] flex items-center justify-center animate-slideUp">
	<div class="w-full max-w-md space-y-4">
		<div class="flex items-center justify-center">
			<div class="inline-flex items-center gap-2 rounded-full border border-brand-soft bg-brand-soft px-4 py-1.5 text-xs font-semibold tracking-[0.08em] text-brand uppercase">
				<Sparkles size={13} />
				AI Fitness Coach
			</div>
		</div>

		<Card padding="lg">
			<div class="space-y-5">
				<div class="space-y-2 text-center">
					<h1 class="text-3xl font-bold text-primary">Welcome Back</h1>
					<p class="text-sm text-secondary">
						Pick up where you left off and keep your training streak alive.
					</p>
				</div>

				<form onsubmit={handleSubmit} class="space-y-4">
					<div>
						<label for="email" class="block text-sm font-semibold text-secondary mb-1.5">Email</label>
						<Input type="email" id="email" bind:value={email} required placeholder="you@example.com" />
					</div>

					<div>
						<label for="password" class="block text-sm font-semibold text-secondary mb-1.5">Password</label>
						<Input
							type="password"
							id="password"
							bind:value={password}
							required
							minLength={6}
							placeholder="Enter your password"
						/>
					</div>

					{#if error}
						<AlertBanner variant="error" title="Sign in failed" message={error} />
					{/if}

					<Button
						type="submit"
						disabled={loading || !email || !password}
						fullWidth
						loading={loading}
						loadingLabel="Signing in..."
					>
						{#snippet children()}
							Sign In
						{/snippet}
					</Button>
				</form>

				<div class="flex items-center justify-center gap-2 text-xs text-muted">
					<ShieldCheck size={14} class="text-success" />
					Secure authentication via Supabase
				</div>

				<p class="text-center text-secondary">
					Don't have an account?
					<a href="/signup" class="text-brand hover:opacity-90 font-semibold"> Sign up</a>
				</p>
			</div>
		</Card>
	</div>
</div>
