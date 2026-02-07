<script lang="ts">
	interface SelectOption {
		value: string;
		label: string;
		disabled?: boolean;
	}

	interface Props {
		id?: string;
		name?: string;
		value: string;
		options: SelectOption[];
		disabled?: boolean;
		ariaLabel?: string;
		onchange?: (e: Event) => void;
	}

	let {
		id,
		name,
		value = $bindable(),
		options,
		disabled = false,
		ariaLabel,
		onchange
	}: Props = $props();
</script>

<div class="relative">
	<select
		{id}
		{name}
		bind:value
		{disabled}
		aria-label={ariaLabel}
		{onchange}
		class="w-full px-4 py-3 pr-10 surface border border-theme rounded-xl text-primary appearance-none cursor-pointer input-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
	>
		{#each options as option}
			<option value={option.value} disabled={option.disabled}>
				{option.label}
			</option>
		{/each}
	</select>

	<svg
		class="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
		width="20"
		height="20"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<polyline points="6 9 12 15 18 9"></polyline>
	</svg>
</div>
