<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { formatDuration } from '$lib/utils/date-helpers';
	import { Timer } from 'lucide-svelte';
	import Button from '../shared/Button.svelte';
	import type { Exercise } from '$lib/types/program';

	interface Props {
		duration: number;
		oncomplete: () => void;
		label?: string;
		nextExercise?: Exercise | null;
	}

	let { duration, oncomplete, label = 'Rest time remaining', nextExercise = null }: Props = $props();

	let remaining = $state(0);
	let startTime = $state(0);
	let intervalId: number | null = null;
	let isComplete = $state(false);

	// Circle properties
	const radius = 90;
	const circumference = 2 * Math.PI * radius;

	onMount(() => {
		remaining = duration;
		startTime = Date.now();
		intervalId = window.setInterval(() => {
			const elapsed = Math.floor((Date.now() - startTime) / 1000);
			remaining = Math.max(0, duration - elapsed);

			if (remaining === 0 && !isComplete) {
				isComplete = true;
				if (intervalId) clearInterval(intervalId);
				// Play beep sound
				try {
					const audio = new Audio(
						'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGmi78OeeSwkNUKXi7rdlHQU5k9jyzH0tBSh+zPLaizsKGGO66+mhUQ0MUKXi7rdlHQU5k9jyzH0tBSh+zPLaizsKGGO66+mgUQ0MUKTi7rZlHQU5k9jyzH0tBSh+zPLaizsKGGO66+mgUQ0MUKTi7rZlHQU5k9jyzH0tBSh+zPLaizsKGGO66+mgUQ0MUKTi7rZlHQU5k9jyzH0tBSh+zPLaizsKGGO66+mgUQ0MUKTi7rZlHQU5k9jyzH0tBSh+zPLaizsKGGO66+mgUQ0MUKTi7rZlHQU5k9jyzH0tBSh+zPLaizsKGGO66+mgUQ0MUKTi7rZlHQU5k9jyzH0tBSh+'
					);
					audio.play();
				} catch (e) {
					// Ignore audio errors
				}
				oncomplete();
			}
		}, 100);
	});

	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
	});

	const progress = $derived((remaining / duration) * 100);
	const strokeDashoffset = $derived(circumference - (progress / 100) * circumference);

	// Color changes as timer progresses
	const timerColor = $derived(() => {
		if (progress > 50) return 'rgb(var(--color-primary))';
		if (progress > 20) return 'rgb(var(--color-warning))';
		return 'rgb(var(--color-error))';
	});

	function skip() {
		if (intervalId) clearInterval(intervalId);
		oncomplete();
	}
</script>

<div
	class="relative overflow-hidden surface rounded-2xl p-6 text-center space-y-6 border border-brand-soft shadow-lg animate-scaleIn"
>
	<!-- Dynamic color background based on timer progress -->
	<div
		class="absolute inset-0 pointer-events-none transition-colors duration-500"
		style="background-color: color-mix(in srgb, {timerColor()} 15%, transparent)"
	></div>

	<!-- Header -->
	<div class="relative flex items-center justify-center gap-2 text-brand">
		<Timer size={20} />
		<span class="text-sm font-bold uppercase tracking-wide">Rest Timer</span>
	</div>

	<!-- Circular Progress Timer -->
	<div class="relative w-52 h-52 mx-auto z-10">
		<!-- Background circle -->
		<svg class="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
			<circle
				cx="100"
				cy="100"
				r={radius}
				fill="none"
				stroke="rgb(var(--color-border))"
				stroke-width="8"
			/>
			<!-- Progress circle -->
			<circle
				cx="100"
				cy="100"
				r={radius}
				fill="none"
				stroke={timerColor()}
				stroke-width="8"
				stroke-linecap="round"
				stroke-dasharray={circumference}
				stroke-dashoffset={strokeDashoffset}
				class="transition-all duration-200 ease-out"
			/>
		</svg>

		<!-- Timer display -->
		<div class="absolute inset-0 flex flex-col items-center justify-center">
			<span
				class="text-5xl font-bold transition-colors duration-200"
				style="color: {timerColor()}"
				class:animate-pulseScale={remaining <= 5 && remaining > 0}
			>
				{formatDuration(remaining)}
			</span>
			<span class="text-sm text-muted mt-1">{label}</span>
		</div>
	</div>

	<!-- Skip button -->
		<div class="relative z-10">
			<Button onclick={skip} variant="ghost" fullWidth={true}>
				{#snippet children()}
					Skip Rest
				{/snippet}
			</Button>
		</div>

	<!-- Next exercise preview -->
		{#if nextExercise}
			<div class="relative z-10 mt-2 p-4 surface-elevated rounded-xl border border-brand-soft">
				<div class="flex items-center gap-2 mb-2">
					<span class="text-xs font-bold text-brand uppercase tracking-wide">Up Next</span>
				</div>
			<p class="text-lg font-semibold text-primary">{nextExercise.name}</p>
			<p class="text-sm text-secondary mt-1">
				{nextExercise.sets} sets &times; {nextExercise.reps || `${nextExercise.duration}s`}
			</p>
			{#if nextExercise.equipment && nextExercise.equipment.length > 0}
				<div class="flex flex-wrap gap-1 mt-2">
					{#each nextExercise.equipment as item}
						<span class="px-2 py-0.5 text-xs bg-brand-soft rounded text-brand">
							{item}
						</span>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
