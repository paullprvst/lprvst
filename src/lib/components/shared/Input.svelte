<script lang="ts">
	interface Props {
		value: string;
		placeholder?: string;
		disabled?: boolean;
		multiline?: boolean;
		rows?: number;
		autofocus?: boolean;
		error?: string;
		maxLength?: number;
		showCharCount?: boolean;
		oninput?: (e: Event) => void;
		onkeydown?: (e: KeyboardEvent) => void;
	}

	let {
		value = $bindable(),
		placeholder = '',
		disabled = false,
		multiline = false,
		rows = 3,
		autofocus = false,
		error,
		maxLength,
		showCharCount = false,
		oninput,
		onkeydown
	}: Props = $props();

	const baseClasses = `
		w-full px-4 py-3
		bg-[rgb(var(--color-surface))]
		border border-[rgb(var(--color-border))]
		rounded-xl
		text-[rgb(var(--color-text-primary))]
		placeholder:text-[rgb(var(--color-text-muted))]
		input-focus-ring
		disabled:bg-[rgb(var(--color-border)/0.3)]
		disabled:cursor-not-allowed
		disabled:text-[rgb(var(--color-text-muted))]
	`;

	const errorClasses = `
		border-[rgb(var(--color-error))]
		focus:border-[rgb(var(--color-error))]
		focus:shadow-[0_0_0_3px_rgb(var(--color-error)/0.1)]
	`;

	const charCount = $derived(value?.length ?? 0);
	const isNearLimit = $derived(maxLength ? charCount >= maxLength * 0.9 : false);
	const isAtLimit = $derived(maxLength ? charCount >= maxLength : false);
</script>

<div class="relative">
	{#if multiline}
		<textarea
			bind:value
			{placeholder}
			{disabled}
			{rows}
			{autofocus}
			{oninput}
			maxlength={maxLength}
			class="{baseClasses} resize-none {error ? errorClasses : ''}"
		></textarea>
	{:else}
		<input
			type="text"
			bind:value
			{placeholder}
			{disabled}
			{autofocus}
			{oninput}
			{onkeydown}
			maxlength={maxLength}
			class="{baseClasses} {error ? errorClasses : ''}"
		/>
	{/if}

	<!-- Error message -->
	{#if error}
		<p class="mt-1.5 text-sm text-[rgb(var(--color-error))] animate-slideUp">
			{error}
		</p>
	{/if}

	<!-- Character count -->
	{#if showCharCount && maxLength}
		<div
			class="absolute bottom-2 right-3 text-xs transition-colors duration-200"
			class:text-[rgb(var(--color-text-muted))]={!isNearLimit}
			class:text-[rgb(var(--color-warning))]={isNearLimit && !isAtLimit}
			class:text-[rgb(var(--color-error))]={isAtLimit}
		>
			{charCount}/{maxLength}
		</div>
	{/if}
</div>
