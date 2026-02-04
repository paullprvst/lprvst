<script lang="ts">
	import type { MuscleGroup } from '$lib/types/program';
	import type { MuscleIntensity } from '$lib/utils/muscle-intensity';
	import { FRONT_MUSCLES, BACK_MUSCLES } from './body-paths';

	interface Props {
		muscle: MuscleGroup | null;
		intensity: MuscleIntensity | null;
		x: number;
		y: number;
		visible: boolean;
	}

	let { muscle, intensity, x, y, visible }: Props = $props();

	const allMuscles = [...FRONT_MUSCLES, ...BACK_MUSCLES];

	const muscleLabel = $derived(() => {
		if (!muscle) return '';
		const found = allMuscles.find((m) => m.id === muscle);
		return found?.label ?? muscle;
	});

	const levelLabel = $derived(() => {
		if (!intensity) return '';
		switch (intensity.level) {
			case 'high':
				return 'High activation';
			case 'medium':
				return 'Medium activation';
			case 'low':
				return 'Low activation';
			default:
				return 'Not targeted';
		}
	});
</script>

{#if visible && muscle}
	<div
		class="pointer-events-none fixed z-50 max-w-xs rounded-lg border border-border bg-neutral-900 p-3 shadow-lg"
		style="left: {x + 12}px; top: {y + 12}px;"
	>
		<div class="mb-1 font-semibold text-foreground">{muscleLabel()}</div>
		<div class="mb-2 text-sm text-foreground-secondary">{levelLabel()}</div>

		{#if intensity && intensity.exercises.length > 0}
			<div class="text-xs text-foreground-tertiary">
				<div class="mb-1 font-medium">Exercises:</div>
				<ul class="list-inside list-disc space-y-0.5">
					{#each intensity.exercises.slice(0, 5) as exercise}
						<li>{exercise}</li>
					{/each}
					{#if intensity.exercises.length > 5}
						<li class="text-foreground-tertiary">+{intensity.exercises.length - 5} more</li>
					{/if}
				</ul>
			</div>
		{:else}
			<div class="text-xs text-foreground-tertiary">No exercises target this muscle</div>
		{/if}
	</div>
{/if}
