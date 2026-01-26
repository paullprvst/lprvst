<script lang="ts">
	import type { Workout } from '$lib/types/program';
	import Card from '../shared/Card.svelte';
	import ExerciseInfoButton from '../shared/ExerciseInfoButton.svelte';
	import { formatWorkoutDuration } from '$lib/utils/formatters';
	import { Clock, ChevronRight, Dumbbell, Flame, Snowflake, Edit2 } from 'lucide-svelte';

	interface Props {
		workout: Workout;
		onclick?: () => void;
		expandable?: boolean;
		onedit?: () => void;
	}

	let { workout, onclick, expandable = true, onedit }: Props = $props();

	let expanded = $state(false);

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
		if (onclick) {
			onclick();
		} else if (expandable) {
			expanded = !expanded;
		}
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

	const exerciseTypeConfig = {
		warmup: {
			icon: Flame,
			iconColor: 'text-amber-500',
			label: 'Warm-up'
		},
		main: {
			icon: Dumbbell,
			iconColor: 'text-cyan-500 dark:text-cyan-400',
			label: 'Workout'
		},
		cooldown: {
			icon: Snowflake,
			iconColor: 'text-emerald-500',
			label: 'Cool-down'
		}
	};
</script>

<Card variant={onclick || expandable ? 'interactive' : 'default'} onclick={handleCardClick}>
	<div class="flex items-start gap-3">
		<!-- Icon -->
		<div
			class="flex-shrink-0 w-10 h-10 rounded-xl bg-cyan-500/10 dark:bg-cyan-400/15 flex items-center justify-center"
		>
			<Dumbbell size={20} class="text-cyan-500 dark:text-cyan-400" />
		</div>

		<!-- Content -->
		<div class="flex-1 min-w-0">
			<div class="flex items-start justify-between gap-2">
				<div class="min-w-0">
					<h3 class="font-semibold text-primary leading-tight">{workout.name}</h3>
					{#if workout.notes && !expanded}
						<p class="text-sm text-secondary mt-0.5 line-clamp-1">{workout.notes}</p>
					{/if}
				</div>

					<!-- Chevron indicator -->
				{#if onclick || expandable}
					<ChevronRight
						size={18}
						class="flex-shrink-0 text-muted transition-transform duration-200 {expanded
							? 'rotate-90'
							: ''}"
					/>
				{/if}
			</div>

			<!-- Meta row -->
			<div class="flex items-center gap-2 mt-2 text-xs text-muted">
				<span class="flex items-center gap-1">
					<Clock size={12} />
					{formatWorkoutDuration(workout.estimatedDuration)}
				</span>
				<span>·</span>
				<span>{mainExercises.length} exercises</span>
			</div>

			<!-- Exercise preview (collapsed state) -->
			{#if !expanded && expandable}
				<p class="text-xs text-muted mt-1.5 line-clamp-1">{exercisePreview()}</p>
			{/if}
		</div>
	</div>

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
								<div class="flex items-center justify-between py-1.5 px-2 -mx-2 rounded-lg hover:bg-gray-500/5">
									<div class="flex items-center gap-1.5 min-w-0">
										<span class="text-sm text-primary truncate">{exercise.name}</span>
										<ExerciseInfoButton
											exerciseName={exercise.name}
											equipment={exercise.equipment}
											notes={exercise.notes}
											size={12}
										/>
									</div>
									<span class="text-xs text-muted flex-shrink-0 ml-2">
										{formatExerciseDetails(exercise)}
									</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			{/each}

			<!-- Edit button -->
			{#if onedit}
				<button
					onclick={(e) => { e.stopPropagation(); onedit(); }}
					class="w-full mt-2 py-2 flex items-center justify-center gap-2 text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors border border-cyan-300 dark:border-cyan-500/40"
				>
					<Edit2 size={16} />
					Edit Workout
				</button>
			{/if}
		</div>
	{/if}
</Card>
