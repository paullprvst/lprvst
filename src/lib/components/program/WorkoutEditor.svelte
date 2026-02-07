<script lang="ts">
	import type { Workout, Exercise } from '$lib/types/program';
	import Button from '../shared/Button.svelte';
	import Input from '../shared/Input.svelte';
	import Select from '../shared/Select.svelte';
	import ExerciseEditor from './ExerciseEditor.svelte';
	import { Plus, Trash2 } from 'lucide-svelte';

	interface Props {
		workout: Workout;
		ondelete: () => void;
	}

	let { workout = $bindable(), ondelete }: Props = $props();

	let expanded = $state(true);

	function addExercise() {
		const newExercise: Exercise = {
			id: crypto.randomUUID(),
			name: '',
			sets: 3,
			reps: '10',
			restBetweenSets: 60,
			restBetweenExercises: 90,
			type: 'main'
		};
		workout.exercises = [...workout.exercises, newExercise];
	}

	function deleteExercise(index: number) {
		workout.exercises = workout.exercises.filter((_, i) => i !== index);
	}

	function moveExercise(index: number, direction: 'up' | 'down') {
		const newIndex = direction === 'up' ? index - 1 : index + 1;
		if (newIndex < 0 || newIndex >= workout.exercises.length) return;

		const exercises = [...workout.exercises];
		[exercises[index], exercises[newIndex]] = [exercises[newIndex], exercises[index]];
		workout.exercises = exercises;
	}

	const workoutTypeOptions = [
		{ value: 'strength', label: 'Strength' },
		{ value: 'cardio', label: 'Cardio' },
		{ value: 'flexibility', label: 'Flexibility' },
		{ value: 'mobility', label: 'Mobility' },
		{ value: 'mixed', label: 'Mixed' }
	];
</script>

<div class="border-2 border-brand-soft rounded-2xl overflow-hidden">
	<!-- Workout header -->
	<div class="p-4 bg-brand-soft border-b border-brand-soft">
		<div class="flex items-center gap-3">
				<button
					onclick={() => expanded = !expanded}
					class="p-1 text-brand hover:bg-brand-soft rounded-lg transition-colors"
					aria-label={expanded ? 'Collapse workout' : 'Expand workout'}
				>
					<span class="text-xs font-semibold">{expanded ? 'Hide' : 'Show'}</span>
				</button>
			<Input
				type="text"
				bind:value={workout.name}
				placeholder="Workout name"
				ariaLabel="Workout name"
				containerClass="flex-1"
				inputClass="px-3 py-2 rounded-lg font-semibold bg-transparent border-transparent"
			/>
			<button
				onclick={ondelete}
				class="p-2 text-error hover:bg-error-soft rounded-lg transition-colors touch-target"
				aria-label="Delete workout"
			>
				<Trash2 size={18} />
			</button>
		</div>

		<!-- Workout meta -->
		<div class="grid grid-cols-2 gap-3 mt-3">
			<div>
				<label for="workout-type-{workout.id}" class="block text-xs font-medium text-muted mb-1">Type</label>
				<Select
					id="workout-type-{workout.id}"
					bind:value={workout.type}
					options={workoutTypeOptions}
					ariaLabel="Workout type"
				/>
			</div>
			<div>
				<label for="workout-duration-{workout.id}" class="block text-xs font-medium text-muted mb-1"
					>Est. Duration (min)</label
				>
				<Input
					id="workout-duration-{workout.id}"
					type="number"
					bind:value={workout.estimatedDuration}
					min="1"
					inputMode="numeric"
					inputClass="px-3 py-2 rounded-lg text-sm"
				/>
			</div>
		</div>

		<div class="mt-3">
			<label for="workout-notes-{workout.id}" class="block text-xs font-medium text-muted mb-1">Notes</label>
			<Input
				id="workout-notes-{workout.id}"
				bind:value={workout.notes}
				placeholder="Optional notes..."
				multiline
				rows={2}
				inputClass="px-3 py-2 rounded-lg text-sm resize-none"
			/>
		</div>
	</div>

	<!-- Exercises list -->
	{#if expanded}
		<div class="p-4 space-y-3">
			{#if workout.exercises.length === 0}
				<p class="text-center text-muted py-4">No exercises yet. Add one below.</p>
			{:else}
				{#each workout.exercises as exercise, index (exercise.id)}
					<ExerciseEditor
						bind:exercise={workout.exercises[index]}
						ondelete={() => deleteExercise(index)}
						onmoveup={() => moveExercise(index, 'up')}
						onmovedown={() => moveExercise(index, 'down')}
						canMoveUp={index > 0}
						canMoveDown={index < workout.exercises.length - 1}
					/>
				{/each}
			{/if}

			<Button onclick={addExercise} variant="secondary" fullWidth={true}>
				{#snippet children()}
					<Plus size={18} />
					Add Exercise
				{/snippet}
			</Button>
		</div>
	{/if}
</div>
