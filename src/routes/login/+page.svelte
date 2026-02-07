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

<div class="min-h-[80vh] flex items-center justify-center">
	<div class="w-full max-w-md">
		<Card padding="lg">
			<h1 class="text-2xl font-bold text-center mb-6">Welcome Back</h1>

		<form onsubmit={handleSubmit} class="space-y-4">
			<div>
				<label for="email" class="block text-sm font-medium text-secondary mb-1">Email</label>
				<Input type="email" id="email" bind:value={email} required placeholder="you@example.com" />
			</div>

			<div>
				<label for="password" class="block text-sm font-medium text-secondary mb-1">Password</label>
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

			<p class="mt-6 text-center text-secondary">
				Don't have an account?
				<a href="/signup" class="text-brand hover:opacity-90 font-medium">Sign up</a>
			</p>
		</Card>
	</div>
</div>
