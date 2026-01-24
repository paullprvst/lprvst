<script lang="ts">
	import type { Exercise } from '$lib/types/program';
	import type { ExerciseLog } from '$lib/types/workout-session';
	import Card from '../shared/Card.svelte';
	import Button from '../shared/Button.svelte';
	import { formatExerciseReps, formatRestTime } from '$lib/utils/formatters';
	import { Check } from 'lucide-svelte';

	interface Props {
		exercise: Exercise;
		log: ExerciseLog;
		onsetcomplete: (setNumber: number) => void;
		onnext: () => void;
	}

	let { exercise, log, onsetcomplete, onnext }: Props = $props();

	const allSetsCompleted = $derived(log.sets.every(s => s.completed));
</script>

<div class="space-y-4">
	<Card padding="lg">
		<div class="space-y-4">
			<div>
				<div class="flex items-center gap-2 mb-2">
					{#if exercise.type === 'warmup'}
						<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
							WARMUP
						</span>
					{:else if exercise.type === 'cooldown'}
						<span class="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
							COOLDOWN
						</span>
					{/if}
				</div>
				<h2 class="text-2xl font-bold text-gray-900">{exercise.name}</h2>
				{#if exercise.notes}
					<p class="text-gray-600 mt-2">{exercise.notes}</p>
				{/if}
			</div>

			{#if exercise.equipment && exercise.equipment.length > 0}
				<div>
					<p class="text-sm font-medium text-gray-500">Equipment</p>
					<p class="text-gray-900">{exercise.equipment.join(', ')}</p>
				</div>
			{/if}

			<div>
				<p class="text-sm font-medium text-gray-500 mb-2">Target</p>
				<p class="text-lg font-semibold text-gray-900">
					{exercise.sets} sets × {formatExerciseReps(exercise.reps, exercise.duration)}
				</p>
				<p class="text-sm text-gray-600 mt-1">{formatRestTime(exercise.restTime)}</p>
			</div>
		</div>
	</Card>

	<Card>
		<div class="space-y-3">
			<h3 class="font-semibold text-gray-900">Sets</h3>
			<div class="grid grid-cols-2 gap-2">
				{#each log.sets as set}
					<button
						onclick={() => onsetcomplete(set.setNumber)}
						class="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors touch-target"
						class:border-green-600={set.completed}
						class:bg-green-50={set.completed}
						class:border-gray-300={!set.completed}
					>
						{#if set.completed}
							<Check size={20} class="text-green-600" />
						{/if}
						<span class="font-medium" class:text-green-600={set.completed}>
							Set {set.setNumber}
						</span>
					</button>
				{/each}
			</div>
		</div>
	</Card>

	{#if allSetsCompleted}
		<Button onclick={onnext} fullWidth={true} size="lg">
			{#snippet children()}
				Next Exercise
			{/snippet}
		</Button>
	{/if}
</div>
