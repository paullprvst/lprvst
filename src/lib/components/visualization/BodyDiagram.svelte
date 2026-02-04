<script lang="ts">
	import type { MuscleGroup } from '$lib/types/program';
	import type { MuscleIntensityMap } from '$lib/utils/muscle-intensity';
	import { getIntensityOpacity } from '$lib/utils/muscle-intensity';
	import { getMusclesByView, getDecorativeByView, getBodyOutline, BODY_VIEWBOX } from './body-paths';

	interface Props {
		view: 'front' | 'back';
		intensityMap: MuscleIntensityMap;
		highlightColor?: string;
		onMuscleHover?: (muscle: MuscleGroup | null, event: MouseEvent) => void;
		onMuscleClick?: (muscle: MuscleGroup) => void;
	}

	let {
		view,
		intensityMap,
		highlightColor = 'rgb(var(--color-primary))',
		onMuscleHover,
		onMuscleClick
	}: Props = $props();

	const muscles = $derived(getMusclesByView(view));
	const decorative = $derived(getDecorativeByView(view));
	const bodyOutline = $derived(getBodyOutline(view));

	function handleMouseEnter(muscle: MuscleGroup, event: MouseEvent) {
		onMuscleHover?.(muscle, event);
	}

	function handleMouseLeave() {
		onMuscleHover?.(null, new MouseEvent('mouseleave'));
	}

	function handleClick(muscle: MuscleGroup) {
		onMuscleClick?.(muscle);
	}
</script>

<svg viewBox={BODY_VIEWBOX} class="h-full w-full">
	<!-- Body outline -->
	<path d={bodyOutline} fill="none" stroke="currentColor" stroke-width="2" class="opacity-20" />

	<!-- Decorative body parts (head, hands, feet, etc.) -->
	{#each decorative as part}
		<g aria-label={part.label}>
			{#each part.paths as path}
				<path
					d={path}
					fill="none"
					stroke="currentColor"
					stroke-width="0.5"
					stroke-opacity="0.15"
					class="pointer-events-none"
				/>
			{/each}
		</g>
	{/each}

	<!-- Muscle regions -->
	{#each muscles as muscle}
		{@const intensity = intensityMap.get(muscle.id)}
		{@const opacity = intensity ? getIntensityOpacity(intensity.level) : 0}
		<g
			class="cursor-pointer transition-all duration-200"
			role="button"
			tabindex="0"
			aria-label={muscle.label}
			onmouseenter={(e) => handleMouseEnter(muscle.id, e)}
			onmouseleave={handleMouseLeave}
			onclick={() => handleClick(muscle.id)}
			onkeydown={(e) => e.key === 'Enter' && handleClick(muscle.id)}
		>
			{#each muscle.paths as path}
				<path
					d={path}
					fill={opacity > 0 ? highlightColor : 'transparent'}
					fill-opacity={opacity}
					stroke={opacity > 0 ? highlightColor : 'currentColor'}
					stroke-width={opacity > 0 ? 1.5 : 0.5}
					stroke-opacity={opacity > 0 ? 0.8 : 0.1}
					class="transition-all duration-200 hover:brightness-110"
				/>
			{/each}
		</g>
	{/each}
</svg>
