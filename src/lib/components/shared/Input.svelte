<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		value: string | number | undefined;
		type?: 'text' | 'email' | 'password' | 'number' | 'date';
		id?: string;
		name?: string;
		ariaLabel?: string;
		placeholder?: string;
		disabled?: boolean;
		multiline?: boolean;
		rows?: number;
		autofocus?: boolean;
		error?: string;
		maxLength?: number;
		minLength?: number;
		required?: boolean;
		min?: number | string;
		max?: number | string;
		step?: number | string;
		inputMode?:
			| 'none'
			| 'text'
			| 'tel'
			| 'url'
			| 'email'
			| 'numeric'
			| 'decimal'
			| 'search';
		showCharCount?: boolean;
		containerClass?: string;
		inputClass?: string;
		oninput?: (e: Event) => void;
		onkeydown?: (e: KeyboardEvent) => void;
		onblur?: (e: FocusEvent) => void;
	}

	let {
		value = $bindable(),
		type = 'text',
		id,
		name,
		ariaLabel,
		placeholder = '',
		disabled = false,
		multiline = false,
		rows = 3,
		autofocus = false,
		error,
		maxLength,
		minLength,
		required = false,
		min,
		max,
		step,
		inputMode,
		showCharCount = false,
		containerClass = '',
		inputClass = '',
		oninput,
		onkeydown,
		onblur
	}: Props = $props();

	const baseClasses = `
		w-full px-4 py-3
		bg-[rgb(var(--color-surface-elevated)/0.76)]
		border border-[rgb(var(--color-border)/0.72)]
		rounded-xl
		text-[rgb(var(--color-text-primary))]
		placeholder:text-[rgb(var(--color-text-muted))]
		placeholder:tracking-[0.01em]
		input-focus-ring
		shadow-[inset_0_1px_0_rgb(255_255_255/0.05)]
		disabled:bg-[rgb(var(--color-border)/0.3)]
		disabled:cursor-not-allowed
		disabled:text-[rgb(var(--color-text-muted))]
	`;

	const errorClasses = `
		border-[rgb(var(--color-error))]
		focus:border-[rgb(var(--color-error))]
		focus:shadow-[0_0_0_3px_rgb(var(--color-error)/0.1)]
	`;

	const charCount = $derived(String(value ?? '').length);
	const isNearLimit = $derived(maxLength ? charCount >= maxLength * 0.9 : false);
	const isAtLimit = $derived(maxLength ? charCount >= maxLength : false);
	const dateInputClass = $derived(type === 'date' ? 'date-input' : '');
	let inputElement = $state<HTMLInputElement | null>(null);
	let textareaElement = $state<HTMLTextAreaElement | null>(null);

	onMount(() => {
		if (!autofocus) return;
		if (multiline && textareaElement) {
			textareaElement.focus();
			return;
		}
		if (inputElement) {
			inputElement.focus();
		}
	});
</script>

<div class="relative {containerClass}">
	{#if multiline}
		<textarea
			bind:this={textareaElement}
			{id}
			{name}
			aria-label={ariaLabel}
			bind:value
			{placeholder}
			{disabled}
			{rows}
			{required}
			{oninput}
			{onkeydown}
			{onblur}
			maxlength={maxLength}
			minlength={minLength}
			class="{baseClasses} resize-none {error ? errorClasses : ''} {inputClass}"
		></textarea>
	{:else}
		<input
			bind:this={inputElement}
			{type}
			{id}
			{name}
			aria-label={ariaLabel}
			bind:value
			{placeholder}
			{disabled}
			{required}
			{min}
			{max}
			{step}
			inputmode={inputMode}
			{oninput}
			{onkeydown}
			{onblur}
			maxlength={maxLength}
			minlength={minLength}
			class="{baseClasses} {dateInputClass} {error ? errorClasses : ''} {inputClass}"
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
