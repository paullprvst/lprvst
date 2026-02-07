<script lang="ts">
	import type { Exercise } from '$lib/types/program';
	import Card from '../shared/Card.svelte';
	import Input from '../shared/Input.svelte';
	import Select from '../shared/Select.svelte';
	import { Trash2 } from 'lucide-svelte';

	interface Props {
		exercise: Exercise;
		ondelete: () => void;
		onmoveup?: () => void;
		onmovedown?: () => void;
		canMoveUp?: boolean;
		canMoveDown?: boolean;
	}

	let { exercise = $bindable(), ondelete, onmoveup, onmovedown, canMoveUp = false, canMoveDown = false }: Props = $props();

	let equipmentText = $state(exercise.equipment?.join(', ') || '');

	// Sync equipment back to exercise when text changes
	$effect(() => {
		exercise.equipment = equipmentText
			.split(',')
			.map(s => s.trim())
			.filter(s => s.length > 0);
	});

	const typeOptions = [
		{ value: 'warmup', label: 'Warm-up' },
		{ value: 'main', label: 'Main' },
		{ value: 'cooldown', label: 'Cool-down' }
	];
</script>

<Card>
	<div class="space-y-4">
		<!-- Header with drag handle and delete -->
		<div class="flex items-center gap-2">
				<div class="flex flex-col gap-0.5">
					{#if onmoveup && canMoveUp}
						<button onclick={onmoveup} class="p-1 text-muted hover:text-primary touch-target">
							<span class="text-[11px] font-semibold">Up</span>
						</button>
					{/if}
					{#if onmovedown && canMoveDown}
						<button onclick={onmovedown} class="p-1 text-muted hover:text-primary touch-target">
							<span class="text-[11px] font-semibold">Down</span>
						</button>
					{/if}
				</div>
			<Input
				type="text"
				bind:value={exercise.name}
				ariaLabel="Exercise name"
				placeholder="Exercise name"
				containerClass="flex-1"
				inputClass="px-3 py-2 rounded-lg font-medium"
			/>
			<button
				onclick={ondelete}
				class="p-2 text-error hover:bg-error-soft rounded-lg transition-colors touch-target"
				aria-label="Delete exercise"
			>
				<Trash2 size={18} />
			</button>
		</div>

		<!-- Type selector -->
		<div>
			<label for="exercise-type-{exercise.id}" class="block text-xs font-medium text-muted mb-1">Type</label>
			<Select
				id="exercise-type-{exercise.id}"
				bind:value={exercise.type}
				options={typeOptions}
				ariaLabel="Exercise type"
			/>
		</div>

		<!-- Sets & Reps row -->
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label for="exercise-sets-{exercise.id}" class="block text-xs font-medium text-muted mb-1">Sets</label>
				<Input
					id="exercise-sets-{exercise.id}"
					type="number"
					bind:value={exercise.sets}
					min="1"
					inputMode="numeric"
					inputClass="px-3 py-2 rounded-lg text-sm"
				/>
			</div>
			<div>
				<label for="exercise-reps-{exercise.id}" class="block text-xs font-medium text-muted mb-1">Reps / Duration</label>
				<Input
					id="exercise-reps-{exercise.id}"
					type="text"
					bind:value={exercise.reps}
					placeholder="e.g., 8-12 or 30 seconds"
					inputClass="px-3 py-2 rounded-lg text-sm"
				/>
			</div>
		</div>

		<!-- Rest times -->
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label for="exercise-rest-sets-{exercise.id}" class="block text-xs font-medium text-muted mb-1"
					>Rest between sets (sec)</label
				>
				<Input
					id="exercise-rest-sets-{exercise.id}"
					type="number"
					bind:value={exercise.restBetweenSets}
					min="0"
					inputMode="numeric"
					inputClass="px-3 py-2 rounded-lg text-sm"
				/>
			</div>
			<div>
				<label for="exercise-rest-next-{exercise.id}" class="block text-xs font-medium text-muted mb-1"
					>Rest before next (sec)</label
				>
				<Input
					id="exercise-rest-next-{exercise.id}"
					type="number"
					bind:value={exercise.restBetweenExercises}
					min="0"
					inputMode="numeric"
					inputClass="px-3 py-2 rounded-lg text-sm"
				/>
			</div>
		</div>

		<!-- Equipment -->
		<div>
			<label for="exercise-equipment-{exercise.id}" class="block text-xs font-medium text-muted mb-1"
				>Equipment (comma-separated)</label
			>
			<Input
				id="exercise-equipment-{exercise.id}"
				type="text"
				bind:value={equipmentText}
				placeholder="e.g., Barbell, Bench"
				inputClass="px-3 py-2 rounded-lg text-sm"
			/>
		</div>

		<!-- Notes -->
		<div>
			<label for="exercise-notes-{exercise.id}" class="block text-xs font-medium text-muted mb-1">Notes</label>
			<Input
				id="exercise-notes-{exercise.id}"
				bind:value={exercise.notes}
				placeholder="Optional notes..."
				multiline
				rows={2}
				inputClass="px-3 py-2 rounded-lg text-sm resize-none"
			/>
		</div>
	</div>
</Card>
