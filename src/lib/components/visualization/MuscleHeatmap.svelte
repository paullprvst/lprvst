<script lang="ts">
	import type { Program } from '$lib/types/program';
	import type { MuscleGroup } from '$lib/types/program';
	import type { MuscleIntensityMap } from '$lib/utils/muscle-intensity';
	import {
		calculateProgramIntensity,
		calculateWorkoutIntensity,
		hasMuscleData
	} from '$lib/utils/muscle-intensity';
	import BodyDiagram from './BodyDiagram.svelte';
	import MuscleTooltip from './MuscleTooltip.svelte';
	import Card from '$lib/components/shared/Card.svelte';

	interface Props {
		program: Program;
		selectedWorkoutIndex?: number | null;
	}

	let { program, selectedWorkoutIndex = null }: Props = $props();

	// Tooltip state
	let hoveredMuscle: MuscleGroup | null = $state(null);
	let tooltipX = $state(0);
	let tooltipY = $state(0);

	// View mode state
	let viewMode: 'program' | 'workout' = $state('program');
	let selectedWorkout = $state(selectedWorkoutIndex);

	// Check if muscle data exists
	const hasData = $derived(hasMuscleData(program.workouts));

	// Calculate intensity map based on view mode
	const intensityMap: MuscleIntensityMap = $derived.by(() => {
		if (!hasData) {
			return new Map();
		}

		if (viewMode === 'workout' && selectedWorkout !== null && program.workouts[selectedWorkout]) {
			return calculateWorkoutIntensity(program.workouts[selectedWorkout]);
		}

		return calculateProgramIntensity(program.workouts);
	});

	function handleMuscleHover(muscle: MuscleGroup | null, event: MouseEvent) {
		hoveredMuscle = muscle;
		if (muscle && event) {
			tooltipX = event.clientX;
			tooltipY = event.clientY;
		}
	}

	function selectWorkout(index: number) {
		selectedWorkout = index;
		viewMode = 'workout';
	}

	function showProgramView() {
		viewMode = 'program';
		selectedWorkout = null;
	}
</script>

<Card>
	<div class="space-y-3">
		<h3 class="text-lg font-semibold text-foreground">Muscle Activation</h3>

		{#if !hasData}
			<div class="py-8 text-center text-foreground-secondary">
				<svg
					class="mx-auto mb-3 h-12 w-12 opacity-50"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<p class="font-medium">Muscle data not available</p>
				<p class="mt-1 text-sm">
					Unable to identify target muscles for the exercises in this program.
				</p>
			</div>
		{:else}
			<!-- Workout selector pills -->
			{#if program.workouts.length > 0}
				<div class="flex flex-wrap gap-1.5">
					<button
						class="rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors {viewMode === 'program'
							? 'bg-primary/90 text-primary-foreground'
							: 'bg-white/5 text-foreground-secondary hover:bg-white/10'}"
						onclick={showProgramView}
					>
						All
					</button>
					{#each program.workouts as workout, index}
						<button
							class="rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors {viewMode === 'workout' &&
							selectedWorkout === index
								? 'bg-primary/90 text-primary-foreground'
								: 'bg-white/5 text-foreground-secondary hover:bg-white/10'}"
							onclick={() => selectWorkout(index)}
						>
							{workout.name}
						</button>
					{/each}
				</div>
			{/if}

			<!-- Body diagrams -->
			<div class="flex items-center justify-center gap-4">
				<div class="w-32 sm:w-40">
					<div class="mb-1 text-center text-xs text-foreground-tertiary">Front</div>
					<BodyDiagram view="front" {intensityMap} onMuscleHover={handleMuscleHover} />
				</div>
				<div class="w-32 sm:w-40">
					<div class="mb-1 text-center text-xs text-foreground-tertiary">Back</div>
					<BodyDiagram view="back" {intensityMap} onMuscleHover={handleMuscleHover} />
				</div>
			</div>

			<!-- Legend -->
			<div class="flex items-center justify-center gap-3 text-xs text-foreground-secondary">
				<div class="flex items-center gap-1">
					<div
						class="h-2.5 w-2.5 rounded-sm"
						style="background-color: rgb(var(--color-primary)); opacity: 0.3;"
					></div>
					<span>Low</span>
				</div>
				<div class="flex items-center gap-1">
					<div
						class="h-2.5 w-2.5 rounded-sm"
						style="background-color: rgb(var(--color-primary)); opacity: 0.6;"
					></div>
					<span>Medium</span>
				</div>
				<div class="flex items-center gap-1">
					<div
						class="h-2.5 w-2.5 rounded-sm"
						style="background-color: rgb(var(--color-primary)); opacity: 1;"
					></div>
					<span>High</span>
				</div>
			</div>
		{/if}
	</div>
</Card>

<!-- Tooltip portal -->
<MuscleTooltip
	muscle={hoveredMuscle}
	intensity={hoveredMuscle ? intensityMap.get(hoveredMuscle) ?? null : null}
	x={tooltipX}
	y={tooltipY}
	visible={hoveredMuscle !== null}
/>
