<script lang="ts">
	import type { Workout } from '$lib/types/program';
	import Card from '../shared/Card.svelte';
	import { formatWorkoutDuration } from '$lib/utils/formatters';
	import { Clock, List, ChevronDown, ChevronUp, Dumbbell } from 'lucide-svelte';

	interface Props {
		workout: Workout;
		onclick?: () => void;
		expandable?: boolean;
	}

	let { workout, onclick, expandable = true }: Props = $props();

	let expanded = $state(false);

	const mainExercises = $derived(workout.exercises.filter(e => e.type === 'main'));
	const warmupExercises = $derived(workout.exercises.filter(e => e.type === 'warmup'));
	const cooldownExercises = $derived(workout.exercises.filter(e => e.type === 'cooldown'));

	function toggleExpand(e: MouseEvent) {
		e.stopPropagation();
		expanded = !expanded;
	}

	function formatExerciseDetails(exercise: typeof workout.exercises[0]): string {
		const parts: string[] = [];
		if (exercise.sets) {
			if (exercise.reps) {
				parts.push(`${exercise.sets} × ${exercise.reps}`);
			} else if (exercise.duration) {
				parts.push(`${exercise.sets} × ${exercise.duration}s`);
			} else {
				parts.push(`${exercise.sets} sets`);
			}
		}
		return parts.join(' • ');
	}
</script>

<div class="w-full text-left">
	<Card>
		<div class="space-y-3">
			<button
				onclick={onclick}
				class="w-full text-left touch-target"
				disabled={!onclick}
			>
				<div>
					<h3 class="text-lg font-semibold text-gray-900">{workout.name}</h3>
					{#if workout.notes}
						<p class="text-sm text-gray-600 mt-1">{workout.notes}</p>
					{/if}
				</div>

				<div class="flex items-center gap-4 text-sm text-gray-500 mt-3">
					<div class="flex items-center gap-1">
						<Clock size={16} />
						<span>{formatWorkoutDuration(workout.estimatedDuration)}</span>
					</div>
					<span>•</span>
					<div class="flex items-center gap-1">
						<List size={16} />
						<span>{mainExercises.length} exercises</span>
					</div>
				</div>
			</button>

			{#if expandable}
				<button
					onclick={toggleExpand}
					class="w-full flex items-center justify-center gap-1 text-sm text-blue-600 hover:text-blue-700 py-2 border-t border-gray-100 mt-2"
				>
					{#if expanded}
						<ChevronUp size={16} />
						<span>Hide exercises</span>
					{:else}
						<ChevronDown size={16} />
						<span>View exercises</span>
					{/if}
				</button>
			{/if}

			{#if expanded}
				<div class="space-y-4 pt-2 border-t border-gray-100">
					{#if warmupExercises.length > 0}
						<div>
							<h4 class="text-xs font-medium text-gray-500 uppercase mb-2">Warm-up</h4>
							<div class="space-y-2">
								{#each warmupExercises as exercise}
									<div class="flex items-start gap-3 p-2 bg-gray-50 rounded-lg">
										<div class="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
											<Dumbbell size={14} class="text-orange-600" />
										</div>
										<div class="flex-1 min-w-0">
											<p class="font-medium text-gray-900 text-sm">{exercise.name}</p>
											<p class="text-xs text-gray-500">{formatExerciseDetails(exercise)}</p>
											{#if exercise.notes}
												<p class="text-xs text-gray-400 mt-1">{exercise.notes}</p>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					{#if mainExercises.length > 0}
						<div>
							<h4 class="text-xs font-medium text-gray-500 uppercase mb-2">Main Workout</h4>
							<div class="space-y-2">
								{#each mainExercises as exercise}
									<div class="flex items-start gap-3 p-2 bg-gray-50 rounded-lg">
										<div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
											<Dumbbell size={14} class="text-blue-600" />
										</div>
										<div class="flex-1 min-w-0">
											<p class="font-medium text-gray-900 text-sm">{exercise.name}</p>
											<p class="text-xs text-gray-500">{formatExerciseDetails(exercise)}</p>
											{#if exercise.equipment && exercise.equipment.length > 0}
												<p class="text-xs text-gray-400">{exercise.equipment.join(', ')}</p>
											{/if}
											{#if exercise.notes}
												<p class="text-xs text-gray-400 mt-1">{exercise.notes}</p>
											{/if}
										</div>
										<div class="text-xs text-gray-400 flex-shrink-0">
											{exercise.restTime}s rest
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					{#if cooldownExercises.length > 0}
						<div>
							<h4 class="text-xs font-medium text-gray-500 uppercase mb-2">Cool-down</h4>
							<div class="space-y-2">
								{#each cooldownExercises as exercise}
									<div class="flex items-start gap-3 p-2 bg-gray-50 rounded-lg">
										<div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
											<Dumbbell size={14} class="text-green-600" />
										</div>
										<div class="flex-1 min-w-0">
											<p class="font-medium text-gray-900 text-sm">{exercise.name}</p>
											<p class="text-xs text-gray-500">{formatExerciseDetails(exercise)}</p>
											{#if exercise.notes}
												<p class="text-xs text-gray-400 mt-1">{exercise.notes}</p>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</Card>
</div>
