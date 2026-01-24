<script lang="ts">
	interface Props {
		value: string;
		placeholder?: string;
		disabled?: boolean;
		multiline?: boolean;
		rows?: number;
		autofocus?: boolean;
		oninput?: (e: Event) => void;
		onkeydown?: (e: KeyboardEvent) => void;
	}

	let { value = $bindable(), placeholder = '', disabled = false, multiline = false, rows = 3, autofocus = false, oninput, onkeydown }: Props = $props();

	const baseClasses = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed';
</script>

{#if multiline}
	<textarea
		bind:value
		{placeholder}
		{disabled}
		{rows}
		{autofocus}
		{oninput}
		class="{baseClasses} resize-none"
	/>
{:else}
	<input
		type="text"
		bind:value
		{placeholder}
		{disabled}
		{autofocus}
		{oninput}
		{onkeydown}
		class={baseClasses}
	/>
{/if}
