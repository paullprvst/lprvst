<script lang="ts">
	import {
		addWeeks,
		subWeeks,
		startOfWeek,
		isThisWeek,
		isSameDay
	} from 'date-fns';
	import {
		getWeekDays,
		getScheduledWorkout,
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

	interface ScheduledWorkout {
		program: Program;
		workout: Program['workouts'][number];
		workoutIndex: number;
		date: Date;
	}

	interface WeekScheduleDay {
		date: Date;
		workouts: ScheduledWorkout[];
	}

	interface UpcomingDayGroup {
		date: Date;
		workouts: ScheduledWorkout[];
	}

	interface Props {
		programs: Program[];
		completedSessions: WorkoutSession[];
		onworkoutclick: (program: Program, workoutId: string, workoutIndex: number, date: Date) => void;
	}

	let { programs, completedSessions, onworkoutclick }: Props = $props();

	let currentWeekStart = $state(startOfWeek(new Date(), { weekStartsOn: 1 }));
	const programWorkoutIds = $derived.by(() => {
		const ids = new Map<string, Set<string>>();
		for (const program of programs) {
			ids.set(
				program.id,
				new Set(program.workouts.map((workout) => workout.id))
			);
		}
		return ids;
	});
	const weekSchedule = $derived.by(() => {
		const days = getWeekDays(currentWeekStart);
		return days.map((date): WeekScheduleDay => {
			const workouts: ScheduledWorkout[] = [];

			for (const program of programs) {
				const scheduled = getScheduledWorkout(program, date);
				if (!scheduled) continue;
				workouts.push({
					program,
					workout: scheduled.workout,
					workoutIndex: scheduled.workoutIndex,
					date
				});
			}

			return { date, workouts };
		});
	});
	const upcomingDayGroups = $derived.by(() => {
		const upcomingByDay = new Map<string, UpcomingDayGroup>();

		for (const program of programs) {
			const workoutIds = programWorkoutIds.get(program.id);
			if (!workoutIds) continue;

			const programCompletedSessions = completedSessions.filter(
				(session) => session.programId === program.id || (!session.programId && workoutIds.has(session.workoutId))
			);
			const programUpcoming = getUpcomingWorkouts(program, programCompletedSessions, 5);

			for (const nextWorkout of programUpcoming) {
				const scheduledWorkout: ScheduledWorkout = {
					program,
					workout: nextWorkout.workout,
					workoutIndex: nextWorkout.workoutIndex,
					date: nextWorkout.date
				};
				const dayKey = `${nextWorkout.date.getFullYear()}-${nextWorkout.date.getMonth()}-${nextWorkout.date.getDate()}`;
				const existingGroup = upcomingByDay.get(dayKey);

				if (existingGroup) {
					existingGroup.workouts.push(scheduledWorkout);
				} else {
					upcomingByDay.set(dayKey, {
						date: nextWorkout.date,
						workouts: [scheduledWorkout]
					});
				}
			}
		}

		const sortedGroups = Array.from(upcomingByDay.values()).sort(
			(a, b) => a.date.getTime() - b.date.getTime()
		);

		for (const group of sortedGroups) {
			group.workouts.sort((a, b) => a.program.name.localeCompare(b.program.name));
		}

		return sortedGroups.slice(0, 5);
	});
	const isCurrentWeek = $derived(isThisWeek(currentWeekStart, { weekStartsOn: 1 }));
	const lastWorkoutDurations = $derived.by(() => {
		const durations = new Map<string, number>();
		const sortedSessions = [...completedSessions].sort((a, b) => {
			const aDate = a.completedAt || a.startedAt;
			const bDate = b.completedAt || b.startedAt;
			return bDate.getTime() - aDate.getTime();
		});

		for (const session of sortedSessions) {
			const durationMinutes = getSessionDurationMinutes(session);
			if (!durationMinutes) continue;

			const keys: string[] = [];
			if (session.programId) {
				keys.push(getDurationKey(session.programId, session.workoutId));
			} else {
				for (const program of programs) {
					const workoutIds = programWorkoutIds.get(program.id);
					if (workoutIds?.has(session.workoutId)) {
						keys.push(getDurationKey(program.id, session.workoutId));
					}
				}
			}

			for (const key of keys) {
				if (!durations.has(key)) {
					durations.set(key, durationMinutes);
				}
			}
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

	function getDurationKey(programId: string, workoutId: string): string {
		return `${programId}:${workoutId}`;
	}

	function handleDayClick(day: WeekScheduleDay) {
		if (day.workouts.length !== 1) return;
		const workout = day.workouts[0];
		onworkoutclick(workout.program, workout.workout.id, workout.workoutIndex, day.date);
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
					{@const dayWorkout = day.workouts[0]?.workout ?? null}
					{@const isCompleted = getCompletedWorkoutForDate(completedSessions, day.date) !== null}
					{@const isClickable = day.workouts.length === 1 || isCompleted}
					<div class="animate-scaleIn" style="animation-delay: {index * 30}ms">
						<CalendarDay
							date={day.date}
							workout={dayWorkout}
							workoutCount={day.workouts.length}
							clickable={isClickable}
							completed={isCompleted}
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
				{#each upcomingDayGroups as dayGroup, index}
					{@const isTodayWorkoutDate = isSameDay(dayGroup.date, new Date())}
					<div class="animate-slideUp" style="animation-delay: {index * 50}ms">
						<div class="text-sm text-secondary mb-2 font-medium break-words">
							<span class="sm:hidden">{formatDate(dayGroup.date, 'EEE, MMM d')}</span>
							<span class="hidden sm:inline">{formatDate(dayGroup.date, 'EEEE, MMM d')}</span>
						</div>
						<div class="space-y-3">
							{#each dayGroup.workouts as scheduled}
								<WorkoutCard
									workout={scheduled.workout}
									onclick={() =>
										onworkoutclick(
											scheduled.program,
											scheduled.workout.id,
											scheduled.workoutIndex,
											scheduled.date
										)}
									mobileCompact={isTodayWorkoutDate}
									showExercisePreview={false}
									desktopTagsRight={true}
									showDescription={false}
									lastWorkoutDurationMinutes={lastWorkoutDurations.get(
										getDurationKey(scheduled.program.id, scheduled.workout.id)
									) ?? null}
								/>
							{/each}
						</div>
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
