<script lang="ts">
	interface Props {
		variant?: 'info' | 'success' | 'warning' | 'error';
		title?: string;
		message: string;
	}

	let { variant = 'info', title, message }: Props = $props();

	const variantClasses = {
		info: 'bg-cyan-500/10 border-cyan-500/25 text-cyan-100',
		success: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200',
		warning: 'bg-amber-500/10 border-amber-500/25 text-amber-200',
		error: 'bg-red-500/10 border-red-500/25 text-red-200'
	};
</script>

<div class="rounded-xl border px-4 py-3 {variantClasses[variant]}" role="status" aria-live="polite">
	{#if title}
		<p class="font-semibold text-sm mb-1">{title}</p>
	{/if}
	<p class="text-sm">{message}</p>
</div>
