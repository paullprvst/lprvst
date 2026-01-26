<script lang="ts">
	import type { Workout, Exercise } from '$lib/types/program';
	import Card from '../shared/Card.svelte';
	import Button from '../shared/Button.svelte';
	import ExerciseEditor from './ExerciseEditor.svelte';
	import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-svelte';

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

	const inputClasses = `
		w-full px-3 py-2
		bg-[rgb(var(--color-surface))]
		border border-[rgb(var(--color-border))]
		rounded-lg
		text-sm
		text-[rgb(var(--color-text-primary))]
		placeholder:text-[rgb(var(--color-text-muted))]
		input-focus-ring
	`;

	const selectClasses = `
		w-full px-3 py-2
		bg-[rgb(var(--color-surface))]
		border border-[rgb(var(--color-border))]
		rounded-lg
		text-sm
		text-[rgb(var(--color-text-primary))]
		input-focus-ring
	`;
</script>

<div class="border-2 border-cyan-300 dark:border-cyan-500/40 rounded-2xl overflow-hidden">
	<!-- Workout header -->
	<div class="p-4 bg-cyan-500/10 dark:bg-cyan-500/15 border-b border-cyan-300 dark:border-cyan-500/40">
		<div class="flex items-center gap-3">
			<button
				onclick={() => expanded = !expanded}
				class="p-1 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition-colors"
			>
				{#if expanded}
					<ChevronUp size={20} />
				{:else}
					<ChevronDown size={20} />
				{/if}
			</button>
			<input
				type="text"
				bind:value={workout.name}
				placeholder="Workout name"
				class="{inputClasses} flex-1 font-semibold bg-transparent border-none"
			/>
			<button
				onclick={ondelete}
				class="p-2 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors touch-target"
			>
				<Trash2 size={18} />
			</button>
		</div>

		<!-- Workout meta -->
		<div class="grid grid-cols-2 gap-3 mt-3">
			<div>
				<label class="block text-xs font-medium text-muted mb-1">Type</label>
				<select bind:value={workout.type} class={selectClasses}>
					<option value="strength">Strength</option>
					<option value="cardio">Cardio</option>
					<option value="flexibility">Flexibility</option>
					<option value="mobility">Mobility</option>
					<option value="mixed">Mixed</option>
				</select>
			</div>
			<div>
				<label class="block text-xs font-medium text-muted mb-1">Est. Duration (min)</label>
				<input
					type="number"
					bind:value={workout.estimatedDuration}
					min="1"
					class={inputClasses}
				/>
			</div>
		</div>

		<div class="mt-3">
			<label class="block text-xs font-medium text-muted mb-1">Notes</label>
			<textarea
				bind:value={workout.notes}
				placeholder="Optional notes..."
				rows="2"
				class="{inputClasses} resize-none"
			></textarea>
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
