<script lang="ts">
	import { isToday } from 'date-fns';
	import type { Workout } from '$lib/types/program';
	import { Check } from 'lucide-svelte';

	interface Props {
		date: Date;
		workout: Workout | null;
		completed?: boolean;
		onclick?: () => void;
	}

	let { date, workout, completed = false, onclick }: Props = $props();

	const isCurrentDay = $derived(isToday(date));
	const hasWorkout = $derived(!!workout);
	const isClickable = $derived(hasWorkout || completed);

	// Build class string for complex conditional styling
	const buttonClasses = $derived(() => {
		const base =
			'w-full aspect-[4/5] sm:aspect-square p-2 rounded-xl border-2 transition-all duration-200 touch-target relative overflow-hidden group';

		if (isCurrentDay) {
			return `${base} border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary)/0.1)] ${hasWorkout && !completed ? 'animate-glowPulse' : ''}`;
		}
		if (completed) {
			return `${base} border-success-soft bg-success-soft`;
		}
		return `${base} border-theme surface ${isClickable ? 'hover:border-theme hover:shadow-sm active:scale-95' : 'cursor-default'}`;
	});
</script>

<button onclick={onclick} class={buttonClasses()} disabled={!isClickable}>
	<div class="h-full flex flex-col items-center justify-start">
		<!-- Date number -->
		<div
			class="text-sm font-semibold transition-colors duration-200 {isCurrentDay
				? 'text-brand'
				: completed
					? 'text-success'
					: 'text-primary'}"
		>
			{date.getDate()}
		</div>

		<!-- Status indicator -->
		<div class="flex-1 flex items-end justify-center pb-1 sm:items-center sm:pb-0">
			{#if completed}
				<div
					class="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[rgb(var(--color-success))] flex items-center justify-center shadow-sm animate-scaleIn"
				>
					<Check size={12} class="text-white sm:hidden" strokeWidth={3} />
					<Check size={14} class="text-white hidden sm:block" strokeWidth={3} />
				</div>
			{:else if workout}
				<div class="relative flex items-center justify-center">
					<div
						class="w-2 h-2 rounded-full bg-[rgb(var(--color-primary))] transition-transform duration-200 group-hover:scale-110 shadow-sm"
					></div>
					{#if isCurrentDay}
						<div
							class="absolute w-2 h-2 rounded-full bg-[rgb(var(--color-primary))] animate-ping opacity-60"
						></div>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- Today indicator line -->
	{#if isCurrentDay}
		<div
			class="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[rgb(var(--color-primary))] rounded-full"
		></div>
	{/if}
</button>
