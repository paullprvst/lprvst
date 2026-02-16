<script lang="ts">
	import type { Workout } from '$lib/types/program';
	import type { ExerciseLog } from '$lib/types/workout-session';
	import Card from '../shared/Card.svelte';
	import ExerciseInfoButton from '../shared/ExerciseInfoButton.svelte';
	import { formatWorkoutDuration } from '$lib/utils/formatters';
	import { Clock, Dumbbell, Flame, Snowflake, Edit2, History } from 'lucide-svelte';

	interface Props {
		workout: Workout;
		onclick?: () => void;
		expandable?: boolean;
		onedit?: () => void;
		lastPerformances?: Map<string, ExerciseLog>;
		mobileCompact?: boolean;
		showExercisePreview?: boolean;
	}

	let {
		workout,
		onclick,
		expandable = true,
		onedit,
		lastPerformances,
		mobileCompact = false,
		showExercisePreview = true
	}: Props = $props();

	function formatLastPerformance(exerciseId: string): string | null {
		if (!lastPerformances) return null;
		const log = lastPerformances.get(exerciseId);
		if (!log) return null;

		const completedSets = log.sets.filter(s => s.completed);
		if (completedSets.length === 0) return null;

		const reps = completedSets.map(s => s.reps).filter((r): r is number => r !== undefined);
		const weights = completedSets.map(s => s.weight).filter((w): w is number => w !== undefined);
		const durations = completedSets.map(s => s.duration).filter((d): d is number => d !== undefined);

		// Time-based exercise
		if (durations.length > 0 && reps.length === 0) {
			const totalDuration = durations.reduce((a, b) => a + b, 0);
			const mins = Math.floor(totalDuration / 60);
			const secs = totalDuration % 60;
			return mins > 0 ? `${completedSets.length}×${mins}m${secs > 0 ? `${secs}s` : ''}` : `${completedSets.length}×${secs}s`;
		}

		if (reps.length === 0) return `${completedSets.length} sets`;

		const allSameReps = reps.every(r => r === reps[0]);
		const allSameWeight = weights.length === 0 || weights.every(w => w === weights[0]);

		if (allSameReps && allSameWeight) {
			const weightStr = weights.length > 0 ? `@${weights[0]}kg` : '';
			return `${completedSets.length}×${reps[0]}${weightStr}`;
		}

		// Group sets by reps (and weight if applicable) to show accurate breakdown
		// e.g., 3x12 + 1x15 instead of misleading 4x15
		const groups: { reps: number; weight?: number; count: number }[] = [];
		for (let i = 0; i < completedSets.length; i++) {
			const setReps = completedSets[i].reps;
			const setWeight = completedSets[i].weight;
			if (setReps === undefined) continue;

			const existing = groups.find(g => g.reps === setReps && g.weight === setWeight);
			if (existing) {
				existing.count++;
			} else {
				groups.push({ reps: setReps, weight: setWeight, count: 1 });
			}
		}

		const hasWeights = weights.length > 0;
		return groups.map(g => {
			const weightStr = hasWeights && g.weight !== undefined ? `@${g.weight}kg` : '';
			return `${g.count}×${g.reps}${weightStr}`;
		}).join(', ');
	}

	let expanded = $state(false);
	const isCardClickable = $derived(!!onclick);
	const cardVariant = $derived(mobileCompact ? 'ghost' : isCardClickable ? 'interactive' : 'default');
	const cardPadding = $derived(mobileCompact ? 'none' : 'md');

	const mainExercises = $derived(workout.exercises.filter((e) => e.type === 'main'));
	const warmupExercises = $derived(workout.exercises.filter((e) => e.type === 'warmup'));
	const cooldownExercises = $derived(workout.exercises.filter((e) => e.type === 'cooldown'));

	// Create a brief exercise preview
	const exercisePreview = $derived(() => {
		const names = mainExercises.slice(0, 2).map((e) => e.name);
		const remaining = mainExercises.length - 2;
		if (remaining > 0) {
			return `${names.join(', ')} +${remaining} more`;
		}
		return names.join(', ');
	});

	function handleCardClick() {
		if (onclick) onclick();
	}

	function toggleExpanded() {
		if (!expandable || onclick) return;
		expanded = !expanded;
	}

	function formatExerciseDetails(exercise: (typeof workout.exercises)[0]): string {
		if (exercise.sets) {
			if (exercise.reps) {
				return `${exercise.sets} × ${exercise.reps}`;
			} else if (exercise.duration) {
				return `${exercise.sets} × ${exercise.duration}s`;
			}
			return `${exercise.sets} sets`;
		}
		return '';
	}

	function getExerciseHistoryHref(exerciseId: string): string {
		return `/history/exercise/${exerciseId}`;
	}

	const exerciseTypeConfig = {
		warmup: {
			icon: Flame,
			iconColor: 'text-warning',
			label: 'Warm-up'
		},
		main: {
			icon: Dumbbell,
			iconColor: 'text-brand',
			label: 'Workout'
		},
		cooldown: {
			icon: Snowflake,
			iconColor: 'text-success',
			label: 'Cool-down'
		}
	};
</script>

<Card
	variant={cardVariant}
	padding={cardPadding}
	onclick={mobileCompact ? undefined : isCardClickable ? handleCardClick : undefined}
>
	{#if expandable && !onclick}
		<button
			type="button"
			class="w-full flex items-start text-left touch-target"
			onclick={toggleExpanded}
			aria-expanded={expanded}
			aria-label={`${expanded ? 'Collapse' : 'Expand'} details for ${workout.name}`}
		>
			<div class="flex-1 min-w-0">
					<div class="flex items-start justify-between gap-2">
						<div class="min-w-0">
							<h3 class="font-semibold text-primary truncate">{workout.name}</h3>
							{#if workout.notes && !expanded}
								<p class="text-sm text-secondary mt-0.5 line-clamp-1">{workout.notes}</p>
							{/if}
						</div>
					</div>

				<div class="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted">
					<span class="flex items-center gap-1">
						<Clock size={12} class={mobileCompact ? 'hidden sm:block' : ''} />
						{formatWorkoutDuration(workout.estimatedDuration)}
					</span>
					<span>·</span>
					<span>{mainExercises.length} exercises</span>
				</div>

				{#if !expanded && showExercisePreview}
					<p class="text-xs text-muted mt-1.5 line-clamp-1 {mobileCompact ? 'hidden sm:block' : ''}">
						{exercisePreview()}
					</p>
				{/if}
			</div>
		</button>
	{:else if mobileCompact}
		{#if onclick}
			<button
				type="button"
				onclick={handleCardClick}
				class="w-full text-left rounded-2xl touch-target"
				aria-label={`Open ${workout.name}`}
			>
				<div
					class="relative min-w-0 rounded-2xl border border-[rgb(var(--color-primary)/0.28)] bg-[linear-gradient(135deg,rgb(var(--color-primary)/0.14)_0%,rgb(var(--color-surface-elevated)/0.78)_42%,rgb(var(--color-surface)/0.74)_100%)] px-3.5 py-3.5 sm:px-4 sm:py-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]"
				>
					<div
						class="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_100%_0%,rgb(var(--color-primary)/0.18),transparent_46%)]"
					></div>

						<div class="relative flex items-start gap-2">
							<h3 class="font-semibold text-primary text-[0.94rem] sm:text-[1rem] leading-tight line-clamp-2">
								{workout.name}
							</h3>
						</div>

					<div class="relative flex flex-wrap items-center gap-2 mt-3">
						<span
							class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-secondary border border-theme bg-[rgb(var(--color-surface)/0.72)]"
						>
							<Clock size={12} class="text-brand" />
							{formatWorkoutDuration(workout.estimatedDuration)}
						</span>
						<span
							class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-secondary border border-theme bg-[rgb(var(--color-surface)/0.72)]"
						>
							<Dumbbell size={12} class="text-brand" />
							{mainExercises.length} exercises
						</span>
					</div>

					{#if showExercisePreview && exercisePreview()}
						<p class="relative text-sm text-secondary mt-2.5 line-clamp-1">
							{exercisePreview()}
						</p>
					{/if}
				</div>
			</button>
		{:else}
			<div
				class="relative min-w-0 rounded-2xl border border-[rgb(var(--color-primary)/0.28)] bg-[linear-gradient(135deg,rgb(var(--color-primary)/0.14)_0%,rgb(var(--color-surface-elevated)/0.78)_42%,rgb(var(--color-surface)/0.74)_100%)] px-3.5 py-3.5 sm:px-4 sm:py-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]"
			>
				<div
					class="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_100%_0%,rgb(var(--color-primary)/0.18),transparent_46%)]"
				></div>

					<div class="relative flex items-start gap-2">
						<h3 class="font-semibold text-primary text-[0.94rem] sm:text-[1rem] leading-tight line-clamp-2">
							{workout.name}
						</h3>
					</div>

				<div class="relative flex flex-wrap items-center gap-2 mt-3">
					<span
						class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-secondary border border-theme bg-[rgb(var(--color-surface)/0.72)]"
					>
						<Clock size={12} class="text-brand" />
						{formatWorkoutDuration(workout.estimatedDuration)}
					</span>
					<span
						class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-secondary border border-theme bg-[rgb(var(--color-surface)/0.72)]"
					>
						<Dumbbell size={12} class="text-brand" />
						{mainExercises.length} exercises
					</span>
				</div>

				{#if showExercisePreview && exercisePreview()}
					<p class="relative text-sm text-secondary mt-2.5 line-clamp-1">
						{exercisePreview()}
					</p>
				{/if}
			</div>
		{/if}
	{:else}
		<div class="flex items-start">
			<div class="flex-1 min-w-0">
				<div class="flex items-start justify-between gap-2">
					<div class="min-w-0">
						<h3 class="font-semibold text-primary truncate">{workout.name}</h3>
						{#if workout.notes && !expanded}
							<p class="text-sm text-secondary mt-0.5 line-clamp-1">{workout.notes}</p>
						{/if}
					</div>

					</div>

				<div class="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted">
					<span class="flex items-center gap-1">
						<Clock size={12} class={mobileCompact ? 'hidden sm:block' : ''} />
						{formatWorkoutDuration(workout.estimatedDuration)}
					</span>
					<span>·</span>
					<span>{mainExercises.length} exercises</span>
				</div>

				{#if !expanded && expandable && showExercisePreview}
					<p class="text-xs text-muted mt-1.5 line-clamp-1 {mobileCompact ? 'hidden sm:block' : ''}">
						{exercisePreview()}
					</p>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Expanded exercise list -->
	{#if expanded}
		<div class="mt-4 pt-3 border-t border-theme space-y-3">
			{#each [{ exercises: warmupExercises, type: 'warmup' }, { exercises: mainExercises, type: 'main' }, { exercises: cooldownExercises, type: 'cooldown' }] as section}
				{#if section.exercises.length > 0}
					{@const config = exerciseTypeConfig[section.type as keyof typeof exerciseTypeConfig]}
					<div>
						<div class="flex items-center gap-1.5 mb-1.5">
							<config.icon size={12} class={config.iconColor} />
							<span class="text-xs font-medium text-muted uppercase tracking-wide">
								{config.label}
							</span>
						</div>
						<div class="space-y-1">
							{#each section.exercises as exercise}
								{@const lastPerf = formatLastPerformance(exercise.id)}
								<div class="flex items-center gap-1.5 py-1.5 px-2 -mx-2 rounded-lg hover:bg-border-soft min-w-0">
									<span class="text-sm text-primary truncate flex-1 min-w-0">{exercise.name}</span>
									<ExerciseInfoButton
										exerciseName={exercise.name}
										equipment={exercise.equipment}
										notes={exercise.notes}
										size={12}
									/>
									<a
										href={getExerciseHistoryHref(exercise.id)}
										class="inline-flex items-center justify-center h-6 w-6 rounded-md text-muted hover:text-brand hover:bg-brand-soft transition-colors"
										aria-label={`Open history for ${exercise.name}`}
										title="Exercise history"
									>
										<History size={12} />
									</a>
									<div class="flex items-center gap-1.5 flex-shrink-0 text-xs whitespace-nowrap">
										{#if lastPerf}
											<span class="text-success">
												{lastPerf}
											</span>
											<span class="text-[rgb(var(--color-border))]">·</span>
										{/if}
										<span class="text-muted">
											{formatExerciseDetails(exercise)}
										</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			{/each}

			<!-- Edit button -->
			{#if onedit}
				<button
					type="button"
					onclick={onedit}
					class="w-full mt-2 py-2 flex items-center justify-center gap-2 text-sm font-medium text-brand hover:bg-brand-soft rounded-lg transition-colors border border-brand-soft touch-target"
				>
					<Edit2 size={16} />
					Edit Workout
				</button>
			{/if}
		</div>
	{/if}
</Card>
