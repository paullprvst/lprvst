<script lang="ts">
	import type { Workout } from '$lib/types/program';
	import Card from '../shared/Card.svelte';
	import { formatWorkoutDuration } from '$lib/utils/formatters';
	import { Clock, List } from 'lucide-svelte';

	interface Props {
		workout: Workout;
		onclick?: () => void;
	}

	let { workout, onclick }: Props = $props();

	const mainExercises = $derived(workout.exercises.filter(e => e.type === 'main'));
</script>

<button
	onclick={onclick}
	class="w-full text-left touch-target"
	disabled={!onclick}
>
	<Card>
		<div class="space-y-3">
			<div>
				<h3 class="text-lg font-semibold text-gray-900">{workout.name}</h3>
				{#if workout.notes}
					<p class="text-sm text-gray-600 mt-1">{workout.notes}</p>
				{/if}
			</div>

			<div class="flex items-center gap-4 text-sm text-gray-500">
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
		</div>
	</Card>
</button>
