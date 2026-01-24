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
</script>

<button
	onclick={onclick}
	class="w-full aspect-square p-2 rounded-lg border transition-colors touch-target {isCurrentDay
		? 'border-blue-600 bg-blue-50'
		: completed
			? 'border-green-500 bg-green-50'
			: 'border-gray-200 hover:border-gray-300'}"
	class:bg-white={!isCurrentDay && !completed}
	disabled={!workout && !completed}
>
	<div class="h-full flex flex-col">
		<div
			class="text-sm font-medium {isCurrentDay ? 'text-blue-600' : completed ? 'text-green-700' : 'text-gray-900'}"
		>
			{date.getDate()}
		</div>
		{#if completed}
			<div class="flex-1 flex items-center justify-center mt-1">
				<div class="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
					<Check size={12} class="text-white" />
				</div>
			</div>
		{:else if workout}
			<div class="flex-1 flex items-center justify-center mt-1">
				<div class="w-2 h-2 rounded-full bg-blue-600"></div>
			</div>
		{/if}
	</div>
</button>
