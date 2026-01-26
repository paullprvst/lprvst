<script lang="ts">
	import type { Exercise } from '$lib/types/program';
	import Card from '../shared/Card.svelte';
	import { Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-svelte';

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

<Card>
	<div class="space-y-4">
		<!-- Header with drag handle and delete -->
		<div class="flex items-center gap-2">
			<div class="flex flex-col gap-0.5">
				{#if onmoveup && canMoveUp}
					<button onclick={onmoveup} class="p-1 text-muted hover:text-primary touch-target">
						<ChevronUp size={16} />
					</button>
				{/if}
				{#if onmovedown && canMoveDown}
					<button onclick={onmovedown} class="p-1 text-muted hover:text-primary touch-target">
						<ChevronDown size={16} />
					</button>
				{/if}
			</div>
			<input
				type="text"
				bind:value={exercise.name}
				placeholder="Exercise name"
				class="{inputClasses} flex-1 font-medium"
			/>
			<button
				onclick={ondelete}
				class="p-2 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors touch-target"
			>
				<Trash2 size={18} />
			</button>
		</div>

		<!-- Type selector -->
		<div>
			<label class="block text-xs font-medium text-muted mb-1">Type</label>
			<select bind:value={exercise.type} class={selectClasses}>
				<option value="warmup">Warm-up</option>
				<option value="main">Main</option>
				<option value="cooldown">Cool-down</option>
			</select>
		</div>

		<!-- Sets & Reps row -->
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label class="block text-xs font-medium text-muted mb-1">Sets</label>
				<input
					type="number"
					bind:value={exercise.sets}
					min="1"
					class={inputClasses}
				/>
			</div>
			<div>
				<label class="block text-xs font-medium text-muted mb-1">Reps / Duration</label>
				<input
					type="text"
					bind:value={exercise.reps}
					placeholder="e.g., 8-12 or 30 seconds"
					class={inputClasses}
				/>
			</div>
		</div>

		<!-- Rest times -->
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label class="block text-xs font-medium text-muted mb-1">Rest between sets (sec)</label>
				<input
					type="number"
					bind:value={exercise.restBetweenSets}
					min="0"
					class={inputClasses}
				/>
			</div>
			<div>
				<label class="block text-xs font-medium text-muted mb-1">Rest before next (sec)</label>
				<input
					type="number"
					bind:value={exercise.restBetweenExercises}
					min="0"
					class={inputClasses}
				/>
			</div>
		</div>

		<!-- Equipment -->
		<div>
			<label class="block text-xs font-medium text-muted mb-1">Equipment (comma-separated)</label>
			<input
				type="text"
				bind:value={equipmentText}
				placeholder="e.g., Barbell, Bench"
				class={inputClasses}
			/>
		</div>

		<!-- Notes -->
		<div>
			<label class="block text-xs font-medium text-muted mb-1">Notes</label>
			<textarea
				bind:value={exercise.notes}
				placeholder="Optional notes..."
				rows="2"
				class="{inputClasses} resize-none"
			></textarea>
		</div>
	</div>
</Card>
