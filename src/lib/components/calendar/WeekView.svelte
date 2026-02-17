<script lang="ts">
	import {
		addWeeks,
		subWeeks,
		startOfWeek,
		isThisWeek,
		isSameDay
	} from 'date-fns';
	import {
		getWeekSchedule,
		formatDate,
		DAY_NAMES_SHORT,
		getCompletedWorkoutForDate,
		getUpcomingWorkouts
	} from '$lib/utils/date-helpers';
	import type { Program } from '$lib/types/program';
	import type { WorkoutSession } from '$lib/types/workout-session';
	import CalendarDay from './CalendarDay.svelte';
	import Card from '../shared/Card.svelte';
	import WorkoutCard from '../program/WorkoutCard.svelte';
	import { CalendarDays } from 'lucide-svelte';
	import { getSessionDurationMinutes } from '$lib/utils/formatters';

	interface Props {
		program: Program;
		completedSessions: WorkoutSession[];
		onworkoutclick: (workoutId: string, workoutIndex: number, date: Date) => void;
	}

	let { program, completedSessions, onworkoutclick }: Props = $props();

	let currentWeekStart = $state(startOfWeek(new Date(), { weekStartsOn: 1 }));

	const weekSchedule = $derived(getWeekSchedule(program, currentWeekStart));
	const upcomingWorkouts = $derived(getUpcomingWorkouts(program, completedSessions, 5));
	const isCurrentWeek = $derived(isThisWeek(currentWeekStart, { weekStartsOn: 1 }));
	const lastWorkoutDurations = $derived.by(() => {
		const durations = new Map<string, number>();
		const sortedSessions = [...completedSessions].sort((a, b) => {
			const aDate = a.completedAt || a.startedAt;
			const bDate = b.completedAt || b.startedAt;
			return bDate.getTime() - aDate.getTime();
		});

		for (const session of sortedSessions) {
			if (session.programId !== program.id) continue;
			if (durations.has(session.workoutId)) continue;

			const durationMinutes = getSessionDurationMinutes(session);
			if (!durationMinutes) continue;
			durations.set(session.workoutId, durationMinutes);
		}

		return durations;
	});

	function previousWeek() {
		currentWeekStart = subWeeks(currentWeekStart, 1);
	}

	function nextWeek() {
		currentWeekStart = addWeeks(currentWeekStart, 1);
	}

	function goToToday() {
		currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
	}

	function handleDayClick(day: (typeof weekSchedule)[0]) {
		if (day.workout) {
			onworkoutclick(day.workout.id, day.workoutIndex!, day.date);
		}
	}
</script>

<div class="space-y-6">
	<!-- Week Calendar Card -->
	<Card variant="info">
		<div class="space-y-3">
			<!-- Week Navigation -->
			<div class="flex items-center justify-between gap-2">
					<button
						onclick={previousWeek}
						class="p-2.5 hover:bg-[rgb(var(--color-primary)/0.12)] hover:border-brand-soft border border-transparent rounded-xl touch-target transition-all duration-200 active:scale-95"
						aria-label="Previous week"
					>
						<span class="text-xs font-semibold text-secondary">Prev</span>
					</button>

				<div class="flex-1 min-w-0 flex flex-col items-center">
					<h2 class="text-sm sm:text-lg font-semibold text-primary text-center leading-tight">
						{formatDate(currentWeekStart, 'MMM d')} - {formatDate(
							weekSchedule[6].date,
							'MMM d, yyyy'
						)}
					</h2>
					{#if !isCurrentWeek}
						<button
							onclick={goToToday}
							class="mt-1 px-2.5 py-1 text-xs font-semibold text-brand bg-brand-soft border border-brand-soft rounded-full hover:opacity-90 transition-colors duration-200 touch-target"
						>
							Today
						</button>
					{/if}
				</div>

					<button
						onclick={nextWeek}
						class="p-2.5 hover:bg-[rgb(var(--color-primary)/0.12)] hover:border-brand-soft border border-transparent rounded-xl touch-target transition-all duration-200 active:scale-95"
						aria-label="Next week"
					>
						<span class="text-xs font-semibold text-secondary">Next</span>
					</button>
			</div>

			<!-- Day headers -->
			<div class="grid grid-cols-7 gap-1">
				{#each DAY_NAMES_SHORT as day}
					<div class="text-center text-xs font-medium text-muted py-1">
						{day}
					</div>
				{/each}
			</div>

			<!-- Calendar days grid -->
			<div class="grid grid-cols-7 gap-1.5 sm:gap-2">
				{#each weekSchedule as day, index}
					<div class="animate-scaleIn" style="animation-delay: {index * 30}ms">
						<CalendarDay
							date={day.date}
							workout={day.workout}
							completed={getCompletedWorkoutForDate(completedSessions, day.date) !== null}
							onclick={() => handleDayClick(day)}
						/>
					</div>
				{/each}
			</div>
		</div>
	</Card>

	<!-- Upcoming Workouts Section -->
	<div class="space-y-3">

			<div class="space-y-3">
				{#each upcomingWorkouts as day, index}
					{@const isTodayWorkout = isSameDay(day.date, new Date())}
					<div class="animate-slideUp" style="animation-delay: {index * 50}ms">
						<div class="text-sm text-secondary mb-2 font-medium break-words">
							<span class="sm:hidden">{formatDate(day.date, 'EEE, MMM d')}</span>
							<span class="hidden sm:inline">{formatDate(day.date, 'EEEE, MMM d')}</span>
						</div>
							<WorkoutCard
								workout={day.workout}
								onclick={() => onworkoutclick(day.workout.id, day.workoutIndex, day.date)}
								mobileCompact={isTodayWorkout}
								lastWorkoutDurationMinutes={lastWorkoutDurations.get(day.workout.id) ?? null}
							/>
					</div>
			{:else}
				<Card variant="info">
					<div class="text-center py-8 space-y-2">
						<CalendarDays size={32} class="mx-auto text-muted" />
						<p class="text-secondary">No upcoming workouts scheduled</p>
					</div>
				</Card>
			{/each}
		</div>
	</div>
</div>
