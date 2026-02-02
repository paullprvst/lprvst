<script lang="ts">
	import LoadingSpinner from './LoadingSpinner.svelte';

	interface Props {
		variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		loading?: boolean;
		fullWidth?: boolean;
		children: import('svelte').Snippet;
		onclick?: () => void;
	}

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		fullWidth = false,
		children,
		onclick
	}: Props = $props();

	const baseClasses =
		'btn font-medium rounded-xl touch-target flex items-center justify-center gap-2 select-none';

	const variantClasses = {
		primary:
			'bg-[rgb(var(--color-primary))] text-white hover:bg-[rgb(var(--color-primary-hover))] disabled:opacity-50 shadow-sm hover:shadow-md',
		secondary:
			'bg-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] hover:bg-[rgb(var(--color-text-muted)/0.3)] disabled:opacity-50',
		danger:
			'bg-[rgb(var(--color-error))] text-white hover:bg-[rgb(var(--color-error)/0.9)] disabled:opacity-50 shadow-sm hover:shadow-md',
		ghost:
			'bg-transparent text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-border)/0.5)] hover:text-[rgb(var(--color-text-primary))] disabled:opacity-50',
		outline:
			'bg-transparent border-2 border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] hover:border-[rgb(var(--color-primary))] hover:text-[rgb(var(--color-primary))] disabled:opacity-50'
	};

	const sizeClasses = {
		sm: 'px-3 py-1.5 text-sm min-h-[36px]',
		md: 'px-4 py-2.5 text-base min-h-[44px]',
		lg: 'px-6 py-3 text-lg min-h-[52px]'
	};

	const widthClass = $derived(fullWidth ? 'w-full' : '');
	const isDisabled = $derived(disabled || loading);
	const spinnerColor = $derived(variant === 'primary' || variant === 'danger' ? 'white' : 'primary');
</script>

<button
	{onclick}
	disabled={isDisabled}
	class="{baseClasses} {variantClasses[variant]} {sizeClasses[size]} {widthClass}"
	class:cursor-not-allowed={isDisabled}
	class:pointer-events-none={loading}
>
	{#if loading}
		<LoadingSpinner size="sm" color={spinnerColor} />
	{:else}
		{@render children()}
	{/if}
</button>
