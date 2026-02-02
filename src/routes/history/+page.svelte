<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { workoutSessionRepository } from '$lib/services/storage/workout-session-repository';
	import { programRepository } from '$lib/services/storage/program-repository';
	import type { WorkoutSession, ExerciseWithLastPerformance, SetLog } from '$lib/types/workout-session';
	import type { Program, Workout } from '$lib/types/program';
	import Card from '$lib/components/shared/Card.svelte';
	import Skeleton from '$lib/components/shared/Skeleton.svelte';
	import WorkoutCalendarDots from '$lib/components/history/WorkoutCalendarDots.svelte';
	import { formatDate } from '$lib/utils/date-helpers';
	import { CheckCircle, Clock, History, Dumbbell, ChevronRight, ChevronDown, ChevronUp, TrendingUp } from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';

	interface SessionWithDetails {
		session: WorkoutSession;
		workout: Workout | null;
		program: Program | null;
	}

	let sessions = $state<SessionWithDetails[]>([]);
	let allSessions = $state<WorkoutSession[]>([]);
	let exercises = $state<ExerciseWithLastPerformance[]>([]);
	let loading = $state(true);
	let showExercises = $state(false);
	let exerciseSearch = $state('');

	const filteredExercises = $derived(
		exerciseSearch.trim()
			? exercises.filter(e => e.exerciseName.toLowerCase().includes(exerciseSearch.toLowerCase()))
			: exercises
	);

	onMount(async () => {
		const completedSessions = await workoutSessionRepository.getCompleted();
		const programs = await programRepository.getAll();

		allSessions = completedSessions;
		sessions = completedSessions.map((session) => {
			const program = programs.find((p) => p.id === session.programId) || null;
			const workout = program?.workouts.find((w) => w.id === session.workoutId) || null;
			return { session, workout, program };
		});

		exercises = await workoutSessionRepository.getAllExercisesWithLastPerformance();

		loading = false;
	});

	function formatSets(sets: SetLog[]): string {
		if (sets.length === 0) return '';

		const reps = sets.map(s => s.reps).filter((r): r is number => r !== undefined);
		const weights = sets.map(s => s.weight).filter((w): w is number => w !== undefined);
		const durations = sets.map(s => s.duration).filter((d): d is number => d !== undefined);

		// Time-based exercise
		if (durations.length > 0 && reps.length === 0) {
			const totalDuration = durations.reduce((a, b) => a + b, 0);
			const mins = Math.floor(totalDuration / 60);
			const secs = totalDuration % 60;
			return mins > 0 ? `${sets.length} sets, ${mins}m ${secs}s` : `${sets.length} sets, ${secs}s`;
		}

		// No reps data
		if (reps.length === 0) return `${sets.length} sets`;

		const allSameReps = reps.every(r => r === reps[0]);
		const allSameWeight = weights.length === 0 || weights.every(w => w === weights[0]);

		if (allSameReps && allSameWeight) {
			const weightStr = weights.length > 0 ? ` @ ${weights[0]}kg` : '';
			return `${sets.length}×${reps[0]}${weightStr}`;
		}

		const minReps = Math.min(...reps);
		const maxReps = Math.max(...reps);
		const repsStr = minReps === maxReps ? `${minReps}` : `${minReps}-${maxReps}`;

		if (weights.length > 0) {
			const maxWeight = Math.max(...weights);
			return `${sets.length}×${repsStr} @ ${maxWeight}kg`;
		}

		return `${sets.length}×${repsStr}`;
	}

	function formatDuration(session: WorkoutSession): string {
		if (!session.completedAt) return 'N/A';
		const duration = Math.floor(
			(session.completedAt.getTime() - session.startedAt.getTime()) / 1000 / 60
		);
		return `${duration} min`;
	}

	function getTotalSets(session: WorkoutSession): number {
		return session.exercises.reduce((total, ex) => total + ex.sets.length, 0);
	}

	function getCompletedSets(session: WorkoutSession): number {
		return session.exercises.reduce(
			(total, ex) => total + ex.sets.filter((s) => s.completed).length,
			0
		);
	}
</script>

<div class="space-y-6 animate-slideUp">
	<div class="flex items-center gap-3">
		<div
			class="w-10 h-10 rounded-xl bg-[rgb(var(--color-primary)/0.1)] flex items-center justify-center"
		>
			<History size={20} class="text-[rgb(var(--color-primary))]" />
		</div>
		<h1 class="text-2xl font-bold text-primary">Workout History</h1>
	</div>

	<!-- 3-Month Calendar Dots -->
	{#if !loading && allSessions.length > 0}
		<Card padding="md">
			<WorkoutCalendarDots sessions={allSessions} />
		</Card>
	{/if}

	<!-- Exercise Progress (Collapsible) -->
	{#if !loading && exercises.length > 0}
		<div class="card">
			<button
				onclick={() => showExercises = !showExercises}
				class="w-full flex items-center justify-between p-4 text-left"
			>
				<div class="flex items-center gap-3">
					<div class="w-8 h-8 rounded-lg bg-[rgb(var(--color-primary)/0.1)] flex items-center justify-center">
						<TrendingUp size={16} class="text-[rgb(var(--color-primary))]" />
					</div>
					<div>
						<span class="font-medium text-primary">Exercise Progress</span>
						<span class="text-sm text-secondary ml-2">({exercises.length} exercises)</span>
					</div>
				</div>
				{#if showExercises}
					<ChevronUp size={20} class="text-muted" />
				{:else}
					<ChevronDown size={20} class="text-muted" />
				{/if}
			</button>

			{#if showExercises}
				<div class="border-t border-[rgb(var(--color-border))] px-4 pb-4">
					<input
						type="text"
						bind:value={exerciseSearch}
						placeholder="Search exercises..."
						class="w-full mt-3 px-3 py-2 text-sm bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] rounded-lg text-[rgb(var(--color-text-primary))] placeholder:text-muted input-focus-ring"
					/>
					<div class="space-y-2 pt-3">
						{#each filteredExercises as exercise}
							<div class="flex items-center gap-3 p-3 rounded-xl bg-[rgb(var(--color-surface))]">
								<div class="flex-shrink-0 w-10 h-10 rounded-lg bg-[rgb(var(--color-primary)/0.1)] flex items-center justify-center">
									<Dumbbell size={18} class="text-[rgb(var(--color-primary))]" />
								</div>
								<div class="flex-1 min-w-0">
									<h4 class="font-medium text-primary text-sm truncate">{exercise.exerciseName}</h4>
									<p class="text-xs text-secondary">{formatSets(exercise.lastSets)}</p>
								</div>
								<div class="text-xs text-muted text-right flex-shrink-0">
									{formatDistanceToNow(exercise.lastPerformedAt, { addSuffix: true })}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	{#if loading}
		<div class="space-y-3">
			<Skeleton variant="card" height="80px" />
			{#each [1, 2, 3] as i}
				<Card>
					<div class="flex items-center gap-4">
						<Skeleton variant="circular" width="48px" height="48px" />
						<div class="flex-1 space-y-2">
							<Skeleton variant="text" width="60%" />
							<Skeleton variant="text" width="40%" />
						</div>
					</div>
				</Card>
			{/each}
		</div>
	{:else if sessions.length === 0}
		<Card padding="lg">
			<div class="text-center py-8 space-y-4">
				<div
					class="w-20 h-20 mx-auto rounded-2xl bg-[rgb(var(--color-border)/0.5)] flex items-center justify-center"
				>
					<Dumbbell size={40} class="text-muted" />
				</div>
				<div class="space-y-2">
					<h3 class="text-lg font-semibold text-primary">No completed workouts yet</h3>
					<p class="text-secondary text-sm max-w-xs mx-auto">
						Start your first workout from the calendar to see your history here.
					</p>
				</div>
			</div>
		</Card>
	{:else}
		<div class="space-y-3">
			{#each sessions as { session, workout, program }, index}
				<button
					class="w-full text-left animate-slideUp group"
					style="animation-delay: {index * 50}ms"
					onclick={() => goto(`/history/${session.id}`)}
				>
					<Card>
						<div class="flex items-center gap-4">
							<!-- Success Icon -->
							<div
								class="flex-shrink-0 w-12 h-12 rounded-xl bg-[rgb(var(--color-success)/0.1)] flex items-center justify-center"
							>
								<CheckCircle size={24} class="text-[rgb(var(--color-success))]" />
							</div>

							<!-- Content -->
							<div class="flex-1 min-w-0">
								<h3 class="font-semibold text-primary truncate">{workout?.name || 'Deleted workout'}</h3>
								<p class="text-sm text-secondary">{program?.name || 'Deleted program'}</p>

								<!-- Meta info -->
								<div class="flex items-center gap-3 mt-2 text-xs text-muted">
									<div class="flex items-center gap-1">
										<Clock size={12} />
										<span>{formatDuration(session)}</span>
									</div>
									<span class="text-[rgb(var(--color-border))]">|</span>
									<span>{getCompletedSets(session)}/{getTotalSets(session)} sets</span>
								</div>
							</div>

							<!-- Date and chevron -->
							<div class="flex items-center gap-2 flex-shrink-0">
								<div class="text-xs text-muted text-right">
									{formatDate(session.completedAt || session.startedAt, 'MMM d')}
									<br />
									{formatDate(session.completedAt || session.startedAt, 'h:mm a')}
								</div>
								<ChevronRight size={20} class="text-muted" />
							</div>
						</div>
					</Card>
				</button>
			{/each}
		</div>
	{/if}
</div>
