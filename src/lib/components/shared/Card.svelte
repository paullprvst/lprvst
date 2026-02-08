<script lang="ts">
	interface Props {
		padding?: 'none' | 'sm' | 'md' | 'lg';
		variant?: 'default' | 'elevated' | 'interactive' | 'info' | 'success' | 'warning' | 'ghost';
		children: import('svelte').Snippet;
		onclick?: () => void;
		className?: string;
	}

	let { padding = 'md', variant = 'default', children, onclick, className = '' }: Props = $props();

	const paddingClasses = {
		none: '',
		sm: 'p-3.5',
		md: 'p-[1.125rem]',
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
		class="{variantClasses[variant]} {paddingClasses[padding]} {className} w-full text-left cursor-pointer transition-all duration-200"
	>
		{@render children()}
	</button>
{:else}
	<div class="{variantClasses[variant]} {paddingClasses[padding]} {className}">
		{@render children()}
	</div>
{/if}
