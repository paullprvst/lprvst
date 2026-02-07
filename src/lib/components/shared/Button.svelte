<script lang="ts">
	import LoadingSpinner from './LoadingSpinner.svelte';

	interface Props {
		variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
		size?: 'sm' | 'md' | 'lg';
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		loading?: boolean;
		loadingLabel?: string;
		fullWidth?: boolean;
		ariaLabel?: string;
		children: import('svelte').Snippet;
		onclick?: () => void;
	}

	let {
		variant = 'primary',
		size = 'md',
		type = 'button',
		disabled = false,
		loading = false,
		loadingLabel,
		fullWidth = false,
		ariaLabel,
		children,
		onclick
	}: Props = $props();

	const baseClasses =
		'btn font-semibold rounded-xl touch-target flex items-center justify-center gap-2 select-none border border-transparent focus-visible:outline-none focus-visible:ring-0';

	const variantClasses = {
		primary:
			'bg-[rgb(var(--color-primary))] text-[rgb(3_11_19)] hover:bg-[rgb(var(--color-primary-hover))] shadow-[0_18px_28px_-20px_rgb(var(--color-primary)/0.95)] hover:shadow-[0_22px_34px_-20px_rgb(var(--color-primary)/0.95)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-55',
		secondary:
			'bg-[rgb(var(--color-surface-elevated))] border-[rgb(var(--color-border)/0.75)] text-[rgb(var(--color-text-primary))] hover:border-[rgb(var(--color-primary)/0.38)] hover:bg-[rgb(var(--color-primary)/0.12)] hover:text-[rgb(var(--color-primary-hover))] disabled:opacity-55',
		danger:
			'bg-[rgb(var(--color-error))] text-[rgb(27_6_6)] hover:bg-[rgb(255_142_142)] shadow-[0_18px_28px_-20px_rgb(var(--color-error)/0.9)] disabled:opacity-55',
		ghost:
			'bg-transparent text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-border)/0.26)] hover:text-[rgb(var(--color-text-primary))] disabled:opacity-55',
		outline:
			'bg-[rgb(var(--color-surface)/0.45)] border-[rgb(var(--color-border)/0.76)] text-[rgb(var(--color-text-primary))] hover:border-[rgb(var(--color-primary)/0.7)] hover:text-[rgb(var(--color-primary-hover))] hover:bg-[rgb(var(--color-primary)/0.14)] disabled:opacity-55'
	};

	const sizeClasses = {
		sm: 'px-3.5 py-2 text-sm min-h-[38px]',
		md: 'px-[1.125rem] py-2.5 text-[0.95rem] min-h-[44px]',
		lg: 'px-6 py-3.5 text-lg min-h-[54px]'
	};

	const widthClass = $derived(fullWidth ? 'w-full' : '');
	const isDisabled = $derived(disabled || loading);
	const spinnerColor = $derived(variant === 'primary' || variant === 'danger' ? 'white' : 'primary');
</script>

<button
	{type}
	{onclick}
	aria-label={ariaLabel}
	disabled={isDisabled}
	class="{baseClasses} {variantClasses[variant]} {sizeClasses[size]} {widthClass}"
	class:cursor-not-allowed={isDisabled}
	class:pointer-events-none={loading}
>
	{#if loading}
		<LoadingSpinner size="sm" color={spinnerColor} />
		{#if loadingLabel}
			<span>{loadingLabel}</span>
		{/if}
	{:else}
		{@render children()}
	{/if}
</button>
