<svelte:head>
	<title>Program Performance | AI Fitness Coach</title>
</svelte:head>

<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { programRepository } from '$lib/services/storage/program-repository';
	import { workoutSessionRepository } from '$lib/services/storage/workout-session-repository';
	import type { Program } from '$lib/types/program';
	import type { SetLog, WorkoutSession } from '$lib/types/workout-session';
	import Card from '$lib/components/shared/Card.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';
	import { DAY_NAMES, formatDate } from '$lib/utils/date-helpers';
	import { ArrowLeft, BarChart3 } from 'lucide-svelte';

	interface WeeklyExerciseEntry {
		id: string;
		dayOfWeek: number;
		dayName: string;
		workoutId: string;
		workoutName: string;
		exerciseId: string;
		exerciseName: string;
	}

	interface ExercisePerformanceRecord {
		workoutId: string;
		performedDayOfWeek: number;
		performedAt: Date;
		sets: SetLog[];
		score: number;
	}

	let loading = $state(true);
	let loadError = $state('');
	let program = $state<Program | null>(null);
	let weeklyExercises = $state<WeeklyExerciseEntry[]>([]);
	let performanceByExerciseId = $state<Map<string, ExercisePerformanceRecord[]>>(new Map());
	let performanceByExerciseName = $state<Map<string, ExercisePerformanceRecord[]>>(new Map());

	onMount(async () => {
		const programId = $page.params.id;
		if (!programId) {
			goto('/programs');
			return;
		}

		try {
			loadError = '';
			const loadedProgram = await programRepository.get(programId);
			if (!loadedProgram) {
				goto('/programs');
				return;
			}

			program = loadedProgram;
			weeklyExercises = buildWeeklyExerciseList(loadedProgram);

			const sessions = await workoutSessionRepository.getByProgram(programId);
			const { byExerciseId, byExerciseName } = buildPerformanceMaps(sessions);
			performanceByExerciseId = byExerciseId;
			performanceByExerciseName = byExerciseName;
		} catch (error) {
			console.warn('Failed to load program performance:', error);
			loadError = 'Unable to load program performance.';
		} finally {
			loading = false;
		}
	});

	function normalizeName(name: string | undefined): string {
		return (name || '').toLowerCase().trim();
	}

	function buildWeeklyExerciseList(currentProgram: Program): WeeklyExerciseEntry[] {
		const sortedSchedule = [...currentProgram.schedule.weeklyPattern].sort(
			(a, b) => a.dayOfWeek - b.dayOfWeek
		);
		const rows: WeeklyExerciseEntry[] = [];
		let rowIndex = 0;

		for (const scheduled of sortedSchedule) {
			const workout = currentProgram.workouts[scheduled.workoutIndex];
			if (!workout) continue;

			for (const exercise of workout.exercises) {
				if (exercise.type === 'warmup') continue;
				rows.push({
					id: `${scheduled.dayOfWeek}-${workout.id}-${exercise.id}-${rowIndex++}`,
					dayOfWeek: scheduled.dayOfWeek,
					dayName: DAY_NAMES[scheduled.dayOfWeek],
					workoutId: workout.id,
					workoutName: workout.name,
					exerciseId: exercise.id,
					exerciseName: exercise.name
				});
			}
		}

		return rows;
	}

	function buildPerformanceMaps(sessions: WorkoutSession[]): {
		byExerciseId: Map<string, ExercisePerformanceRecord[]>;
		byExerciseName: Map<string, ExercisePerformanceRecord[]>;
	} {
		const byExerciseId = new Map<string, ExercisePerformanceRecord[]>();
		const byExerciseName = new Map<string, ExercisePerformanceRecord[]>();
		const completedSessions = sessions
			.filter((session) => session.status === 'completed' || Boolean(session.completedAt))
			.sort((a, b) => {
				const aDate = a.completedAt || a.startedAt;
				const bDate = b.completedAt || b.startedAt;
				return bDate.getTime() - aDate.getTime();
			});

		for (const session of completedSessions) {
			const performedAt = session.completedAt || session.startedAt;
			const performedDayOfWeek = getMondayBasedDayOfWeek(performedAt);
			for (const exerciseLog of session.exercises) {
				if (exerciseLog.skipped) continue;

				const completedSets = exerciseLog.sets.filter((set) => set.completed);
				if (completedSets.length === 0) continue;

				const record: ExercisePerformanceRecord = {
					workoutId: session.workoutId,
					performedDayOfWeek,
					performedAt,
					sets: completedSets,
					score: computePerformanceScore(completedSets)
				};

				const recordsById = byExerciseId.get(exerciseLog.exerciseId) || [];
				recordsById.push(record);
				byExerciseId.set(exerciseLog.exerciseId, recordsById);

				const exerciseNameKey = normalizeName(exerciseLog.exerciseName);
				if (exerciseNameKey) {
					const recordsByName = byExerciseName.get(exerciseNameKey) || [];
					recordsByName.push(record);
					byExerciseName.set(exerciseNameKey, recordsByName);
				}
			}
		}

		return { byExerciseId, byExerciseName };
	}

	function getMondayBasedDayOfWeek(date: Date): number {
		return (date.getDay() + 6) % 7;
	}

	function computePerformanceScore(sets: SetLog[]): number {
		// If weight is 0 or missing, treat the set as reps-only so score is not zeroed out.
		const rawScore = sets.reduce((total, set) => {
			const reps = set.reps ?? 0;
			const weight = set.weight ?? 0;
			return total + (weight > 0 ? reps * weight : reps);
		}, 0);

		return Math.round(rawScore * 10) / 10;
	}

	function getPerformanceHistory(exercise: WeeklyExerciseEntry): ExercisePerformanceRecord[] {
		const byId = (performanceByExerciseId.get(exercise.exerciseId) || []).filter(
			(record) =>
				record.workoutId === exercise.workoutId &&
				record.performedDayOfWeek === exercise.dayOfWeek
		);
		if (byId.length > 0) return byId;
		return (performanceByExerciseName.get(normalizeName(exercise.exerciseName)) || []).filter(
			(record) =>
				record.workoutId === exercise.workoutId &&
				record.performedDayOfWeek === exercise.dayOfWeek
		);
	}

	function formatSetSummaryCompact(set: SetLog): string {
		const reps = set.reps;
		const weight = set.weight;

		if (reps !== undefined && weight !== undefined && weight > 0) {
			return `${reps}@${formatNumber(weight)}`;
		}
		if (reps !== undefined) {
			return `${reps}`;
		}
		if (weight !== undefined && weight > 0) {
			return `@${formatNumber(weight)}`;
		}
		if (set.duration !== undefined) {
			return `${set.duration}s`;
		}

		return 'set';
	}

	function summarizeSetPattern(sets: SetLog[]): string {
		const counts = new Map<string, number>();
		const order: string[] = [];

		for (const set of sets) {
			const key = formatSetSummaryCompact(set);
			if (!counts.has(key)) {
				order.push(key);
				counts.set(key, 0);
			}
			counts.set(key, (counts.get(key) || 0) + 1);
		}

		return order
			.map((key) => {
				const count = counts.get(key) || 0;
				return count > 1 ? `${count}x${key}` : key;
			})
			.join(' + ');
	}

	function formatNumber(value: number): string {
		return Number.isInteger(value) ? `${value}` : `${value.toFixed(1)}`;
	}
</script>

<div class="space-y-6 animate-slideUp">
	<div class="flex items-center gap-3">
		<button
			type="button"
			onclick={() => goto(`/programs/${program?.id ?? ''}`)}
			class="p-2 rounded-xl hover:bg-border-soft transition-colors touch-target"
			aria-label="Back to program"
		>
			<ArrowLeft size={24} class="text-primary" />
		</button>
		<div class="min-w-0">
			<h1 class="text-xl font-bold text-primary truncate">Performance</h1>
			<p class="text-sm text-secondary truncate">{program?.name || 'Program'}</p>
		</div>
	</div>

	{#if loading}
		<div class="flex justify-center py-12">
			<LoadingSpinner size="lg" />
		</div>
	{:else if loadError}
		<Card padding="lg">
			<div class="space-y-3 text-center py-4">
				<h2 class="text-lg font-semibold text-primary">{loadError}</h2>
				<Button onclick={() => goto(`/programs/${$page.params.id}`)} variant="secondary">
					{#snippet children()}
						Back to program
					{/snippet}
				</Button>
			</div>
		</Card>
	{:else}
		{#if weeklyExercises.length === 0}
			<Card padding="lg" variant="info">
				<div class="text-center py-6 space-y-3">
					<div class="w-16 h-16 mx-auto rounded-2xl bg-border-soft flex items-center justify-center">
						<BarChart3 size={28} class="text-muted" />
					</div>
					<h2 class="text-lg font-semibold text-primary">No non-warmup exercises in this week</h2>
					<p class="text-sm text-secondary">
						Add main or cooldown exercises to this program to see performance history.
					</p>
				</div>
			</Card>
		{:else}
			<div class="space-y-3">
				{#each weeklyExercises as exercise, index}
					{@const showDaySeparator =
						index === 0 || weeklyExercises[index - 1].dayOfWeek !== exercise.dayOfWeek}
					{#if showDaySeparator}
						<div class="flex items-center gap-3 py-1">
							<div class="h-px flex-1 bg-border-soft"></div>
							<p class="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{exercise.dayName}</p>
							<div class="h-px flex-1 bg-border-soft"></div>
						</div>
					{/if}
					{@const history = getPerformanceHistory(exercise)}
					<Card>
						<div class="space-y-3">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<h2 class="font-semibold text-primary truncate">{exercise.exerciseName}</h2>
									<p class="text-sm text-secondary truncate">{exercise.workoutName}</p>
								</div>
							</div>

							{#if history.length === 0}
								<p class="text-sm text-secondary">No performance history yet.</p>
							{:else}
								<div class="space-y-1.5">
									{#each history as record}
										<div class="rounded-lg border border-theme bg-border-soft px-3 py-2 text-sm flex items-start gap-3">
											<p class="text-primary break-words min-w-0 flex-1">
												<span class="text-secondary">{formatDate(record.performedAt, 'MMM d')}:</span>
												{' '}
												{summarizeSetPattern(record.sets)}
											</p>
											<p class="font-bold text-right whitespace-nowrap">{formatNumber(record.score)}</p>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</Card>
				{/each}
			</div>
		{/if}
	{/if}
</div>
