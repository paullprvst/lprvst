<svelte:head>
	<title>Sign Up | AI Fitness Coach</title>
</svelte:head>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { signUp, getAuthState } from '$lib/stores/auth-store.svelte';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';

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
	<div class="card p-8 w-full max-w-md">
		<h1 class="text-2xl font-bold text-center mb-6">Create Account</h1>

		{#if success}
			<div class="text-center space-y-4">
				<div class="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400">
					<p class="font-medium">Account created successfully!</p>
					<p class="text-sm mt-1">Please check your email to confirm your account.</p>
				</div>
				<a href="/login" class="inline-block text-cyan-600 hover:text-cyan-500 font-medium">
					Go to login
				</a>
			</div>
		{:else}
			<form onsubmit={handleSubmit} class="space-y-4">
				<div>
					<label for="email" class="block text-sm font-medium text-secondary mb-1">Email</label>
					<input
						type="email"
						id="email"
						bind:value={email}
						required
						class="w-full px-4 py-3 rounded-xl bg-surface border border-theme focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-colors"
						placeholder="you@example.com"
					/>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-secondary mb-1">Password</label>
					<input
						type="password"
						id="password"
						bind:value={password}
						required
						minlength="6"
						class="w-full px-4 py-3 rounded-xl bg-surface border border-theme focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-colors"
						placeholder="At least 6 characters"
					/>
				</div>

				<div>
					<label for="confirmPassword" class="block text-sm font-medium text-secondary mb-1">Confirm Password</label>
					<input
						type="password"
						id="confirmPassword"
						bind:value={confirmPassword}
						required
						minlength="6"
						class="w-full px-4 py-3 rounded-xl bg-surface border border-theme focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-colors"
						placeholder="Confirm your password"
					/>
				</div>

				{#if error}
					<div class="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm">
						{error}
					</div>
				{/if}

				<button
					type="submit"
					disabled={loading || !email || !password || !confirmPassword}
					class="w-full py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
				>
					{#if loading}
						<LoadingSpinner size="sm" />
						Creating account...
					{:else}
						Create Account
					{/if}
				</button>
			</form>

			<p class="mt-6 text-center text-secondary">
				Already have an account?
				<a href="/login" class="text-cyan-600 hover:text-cyan-500 font-medium">Sign in</a>
			</p>
		{/if}
	</div>
</div>
