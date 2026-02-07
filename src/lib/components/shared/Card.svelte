<script lang="ts">
	interface Props {
		padding?: 'none' | 'sm' | 'md' | 'lg';
		variant?: 'default' | 'elevated' | 'interactive' | 'info' | 'success' | 'warning' | 'ghost';
		children: import('svelte').Snippet;
		onclick?: () => void;
	}

	let { padding = 'md', variant = 'default', children, onclick }: Props = $props();

	const paddingClasses = {
		none: '',
		sm: 'p-3',
		md: 'p-4',
		lg: 'p-6'
	};

	const variantClasses = {
		default: 'card',
		elevated: 'card card-elevated',
		interactive: 'card card-interactive',
		info: 'card card-info',
		success: 'card card-success',
		warning: 'card card-warning',
		ghost: 'bg-transparent'
	};

	const isInteractive = $derived(variant === 'interactive' && !!onclick);
</script>

{#if isInteractive}
	<button
		type="button"
		{onclick}
		class="{variantClasses[variant]} {paddingClasses[padding]} w-full text-left cursor-pointer"
	>
		{@render children()}
	</button>
{:else}
	<div class="{variantClasses[variant]} {paddingClasses[padding]}">
		{@render children()}
	</div>
{/if}
