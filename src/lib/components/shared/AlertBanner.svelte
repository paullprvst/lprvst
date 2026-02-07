<script lang="ts">
	interface Props {
		variant?: 'info' | 'success' | 'warning' | 'error';
		title?: string;
		message: string;
	}

	let { variant = 'info', title, message }: Props = $props();

	const variantClasses = {
		info: 'bg-brand-soft border-brand-soft text-primary',
		success: 'bg-success-soft border-success-soft text-success',
		warning: 'bg-warning-soft border-warning-soft text-warning',
		error: 'bg-error-soft border-error-soft text-error'
	};
</script>

<div class="rounded-xl border px-4 py-3 {variantClasses[variant]}" role="status" aria-live="polite">
	{#if title}
		<p class="font-semibold text-sm mb-1">{title}</p>
	{/if}
	<p class="text-sm">{message}</p>
</div>
