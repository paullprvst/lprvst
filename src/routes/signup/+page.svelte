<svelte:head>
	<title>Sign Up | AI Fitness Coach</title>
</svelte:head>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { signUp, getAuthState } from '$lib/stores/auth-store.svelte';
	import Card from '$lib/components/shared/Card.svelte';
	import Input from '$lib/components/shared/Input.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import AlertBanner from '$lib/components/shared/AlertBanner.svelte';

	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let success = $state(false);
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

		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}

		if (password.length < 6) {
			error = 'Password must be at least 6 characters';
			return;
		}

		loading = true;

		const result = await signUp(email, password);

		if (result.error) {
			error = result.error.message;
			loading = false;
		} else {
			success = true;
			loading = false;
		}
	}
</script>

<div class="min-h-[80vh] flex items-center justify-center">
	<div class="w-full max-w-md">
		<Card padding="lg">
			<h1 class="text-2xl font-bold text-center mb-6">Create Account</h1>

			{#if success}
				<div class="text-center space-y-4">
					<AlertBanner
						variant="success"
						title="Account created"
						message="Please check your email to confirm your account."
					/>
					<a href="/login" class="inline-block text-cyan-600 hover:text-cyan-500 font-medium">
						Go to login
					</a>
				</div>
			{:else}
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
							placeholder="At least 6 characters"
						/>
					</div>

					<div>
						<label for="confirmPassword" class="block text-sm font-medium text-secondary mb-1"
							>Confirm Password</label
						>
						<Input
							type="password"
							id="confirmPassword"
							bind:value={confirmPassword}
							required
							minLength={6}
							placeholder="Confirm your password"
						/>
					</div>

					{#if error}
						<AlertBanner variant="error" title="Sign up failed" message={error} />
					{/if}

					<Button
						type="submit"
						disabled={loading || !email || !password || !confirmPassword}
						fullWidth
						loading={loading}
						loadingLabel="Creating account..."
					>
						{#snippet children()}
							Create Account
						{/snippet}
					</Button>
				</form>

				<p class="mt-6 text-center text-secondary">
					Already have an account?
					<a href="/login" class="text-cyan-600 hover:text-cyan-500 font-medium">Sign in</a>
				</p>
			{/if}
		</Card>
	</div>
</div>
