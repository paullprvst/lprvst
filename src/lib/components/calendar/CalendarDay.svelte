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
			'w-full aspect-square p-2 rounded-xl border-2 transition-all duration-200 touch-target relative overflow-hidden group';

		if (isCurrentDay) {
			return `${base} border-blue-500 bg-blue-500/5 ${hasWorkout && !completed ? 'animate-glowPulse' : ''}`;
		}
		if (completed) {
			return `${base} border-green-500 bg-green-500/5`;
		}
		return `${base} border-theme surface ${isClickable ? 'hover:border-gray-300 hover:shadow-sm active:scale-95' : 'cursor-default'}`;
	});
</script>

<button onclick={onclick} class={buttonClasses()} disabled={!isClickable}>
	<div class="h-full flex flex-col items-center">
		<!-- Date number -->
		<div
			class="text-sm font-semibold transition-colors duration-200 {isCurrentDay
				? 'text-blue-500'
				: completed
					? 'text-green-500'
					: 'text-primary'}"
		>
			{date.getDate()}
		</div>

		<!-- Status indicator -->
		<div class="flex-1 flex items-center justify-center">
			{#if completed}
				<div
					class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-sm animate-scaleIn"
				>
					<Check size={14} class="text-white" strokeWidth={3} />
				</div>
			{:else if workout}
				<div class="relative flex items-center justify-center">
					<div
						class="w-2 h-2 rounded-full bg-blue-500 transition-transform duration-200 group-hover:scale-110 shadow-sm"
					></div>
					{#if isCurrentDay}
						<div
							class="absolute w-2 h-2 rounded-full bg-blue-400 animate-ping opacity-60"
						></div>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- Today indicator line -->
	{#if isCurrentDay}
		<div
			class="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-500 rounded-full"
		></div>
	{/if}
</button>
