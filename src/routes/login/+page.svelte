<svelte:head>
	<title>Sign In | AI Fitness Coach</title>
</svelte:head>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { signIn, getAuthState } from '$lib/stores/auth-store.svelte';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';

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
	<div class="card p-8 w-full max-w-md">
		<h1 class="text-2xl font-bold text-center mb-6">Welcome Back</h1>

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
					placeholder="Enter your password"
				/>
			</div>

			{#if error}
				<div class="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm">
					{error}
				</div>
			{/if}

			<button
				type="submit"
				disabled={loading || !email || !password}
				class="w-full py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
			>
				{#if loading}
					<LoadingSpinner size="sm" />
					Signing in...
				{:else}
					Sign In
				{/if}
			</button>
		</form>

		<p class="mt-6 text-center text-secondary">
			Don't have an account?
			<a href="/signup" class="text-cyan-600 hover:text-cyan-500 font-medium">Sign up</a>
		</p>
	</div>
</div>
