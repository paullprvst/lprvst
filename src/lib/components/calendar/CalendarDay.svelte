<script lang="ts">
	import { isToday } from 'date-fns';
	import type { Workout } from '$lib/types/program';

	interface Props {
		date: Date;
		workout: Workout | null;
		onclick?: () => void;
	}

	let { date, workout, onclick }: Props = $props();

	const isCurrentDay = $derived(isToday(date));
</script>

<button
	onclick={onclick}
	class="w-full aspect-square p-2 rounded-lg border transition-colors touch-target {isCurrentDay
		? 'border-blue-600 bg-blue-50'
		: 'border-gray-200 hover:border-gray-300'}"
	class:bg-white={!isCurrentDay}
	disabled={!workout}
>
	<div class="h-full flex flex-col">
		<div
			class="text-sm font-medium {isCurrentDay ? 'text-blue-600' : 'text-gray-900'}"
		>
			{date.getDate()}
		</div>
		{#if workout}
			<div class="flex-1 flex items-center justify-center mt-1">
				<div class="w-2 h-2 rounded-full bg-blue-600"></div>
			</div>
		{/if}
	</div>
</button>
