<script lang="ts">
	import { addWeeks, subWeeks, startOfWeek } from 'date-fns';
	import { getWeekSchedule, formatDate, DAY_NAMES_SHORT } from '$lib/utils/date-helpers';
	import type { Program } from '$lib/types/program';
	import CalendarDay from './CalendarDay.svelte';
	import Card from '../shared/Card.svelte';
	import WorkoutCard from '../program/WorkoutCard.svelte';
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';

	interface Props {
		program: Program;
		onworkoutclick: (workoutId: string, workoutIndex: number, date: Date) => void;
	}

	let { program, onworkoutclick }: Props = $props();

	let currentWeekStart = $state(startOfWeek(new Date(), { weekStartsOn: 0 }));

	const weekSchedule = $derived(getWeekSchedule(program, currentWeekStart));
	const selectedDay = $state<{ date: Date; workout: any; workoutIndex: number } | null>(null);

	function previousWeek() {
		currentWeekStart = subWeeks(currentWeekStart, 1);
	}

	function nextWeek() {
		currentWeekStart = addWeeks(currentWeekStart, 1);
	}

	function handleDayClick(day: typeof weekSchedule[0]) {
		if (day.workout) {
			onworkoutclick(day.workout.id, day.workoutIndex!, day.date);
		}
	}
</script>

<div class="space-y-4">
	<Card>
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<button
					onclick={previousWeek}
					class="p-2 hover:bg-gray-100 rounded-lg touch-target"
				>
					<ChevronLeft size={20} />
				</button>
				<h2 class="text-lg font-semibold">
					{formatDate(currentWeekStart, 'MMM d')} - {formatDate(weekSchedule[6].date, 'MMM d, yyyy')}
				</h2>
				<button
					onclick={nextWeek}
					class="p-2 hover:bg-gray-100 rounded-lg touch-target"
				>
					<ChevronRight size={20} />
				</button>
			</div>

			<div class="grid grid-cols-7 gap-1">
				{#each DAY_NAMES_SHORT as day}
					<div class="text-center text-xs font-medium text-gray-500 py-2">
						{day}
					</div>
				{/each}
			</div>

			<div class="grid grid-cols-7 gap-2">
				{#each weekSchedule as day}
					<CalendarDay
						date={day.date}
						workout={day.workout}
						onclick={() => handleDayClick(day)}
					/>
				{/each}
			</div>
		</div>
	</Card>

	<div>
		<h3 class="text-lg font-semibold mb-3">This Week's Workouts</h3>
		<div class="space-y-3">
			{#each weekSchedule.filter(d => d.workout) as day}
				<div>
					<div class="text-sm text-gray-500 mb-1">
						{formatDate(day.date, 'EEEE, MMM d')}
					</div>
					<WorkoutCard
						workout={day.workout}
						onclick={() => handleDayClick(day)}
					/>
				</div>
			{:else}
				<Card>
					<p class="text-gray-500 text-center py-4">No workouts scheduled this week</p>
				</Card>
			{/each}
		</div>
	</div>
</div>
