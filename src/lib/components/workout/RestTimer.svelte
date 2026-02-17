<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { formatDuration } from '$lib/utils/date-helpers';
	import { formatExercisePerformanceFull } from '$lib/utils/formatters';
	import { Timer, MessageSquare, History } from 'lucide-svelte';
	import Button from '../shared/Button.svelte';
	import ExerciseInfoButton from '../shared/ExerciseInfoButton.svelte';
	import type { Exercise } from '$lib/types/program';
	import type { ExerciseLog } from '$lib/types/workout-session';

	interface Props {
		duration: number;
		oncomplete: () => void;
		label?: string;
		nextExercise?: Exercise | null;
		currentExercise?: Exercise | null;
		currentExerciseLog?: ExerciseLog | null;
		currentLastPerformance?: ExerciseLog;
		nextExerciseLastPerformance?: ExerciseLog;
		onopennotes?: () => void;
	}

	let {
		duration,
		oncomplete,
		label = 'Rest time remaining',
		nextExercise = null,
		currentExercise = null,
		currentExerciseLog = null,
		currentLastPerformance,
		nextExerciseLastPerformance,
		onopennotes
	}: Props = $props();

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
	const currentSessionNote = $derived(currentExerciseLog?.notes?.trim() || '');
	const lastSessionNote = $derived(currentLastPerformance?.notes?.trim() || '');
	const currentLastPerformanceSummary = $derived(
		currentLastPerformance ? formatExercisePerformanceFull(currentLastPerformance) : ''
	);
	const nextLastPerformanceSummary = $derived(
		nextExerciseLastPerformance ? formatExercisePerformanceFull(nextExerciseLastPerformance) : ''
	);

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
	class="relative overflow-hidden surface rounded-2xl p-4 sm:p-5 text-center space-y-4 border border-brand-soft shadow-lg animate-scaleIn"
>
	<!-- Dynamic color background based on timer progress -->
	<div
		class="absolute inset-0 pointer-events-none transition-colors duration-500"
		style="background-color: color-mix(in srgb, {timerColor()} 15%, transparent)"
	></div>

	<!-- Header -->
	<div class="relative flex items-center justify-center gap-1.5 text-brand">
		<Timer size={18} />
		<span class="text-xs font-bold uppercase tracking-wide">Rest Timer</span>
	</div>

	<!-- Circular Progress Timer -->
	<div class="relative w-40 h-40 sm:w-44 sm:h-44 mx-auto z-10">
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
				class="text-4xl font-bold transition-colors duration-200"
				style="color: {timerColor()}"
				class:animate-pulseScale={remaining <= 5 && remaining > 0}
			>
				{formatDuration(remaining)}
			</span>
			<span class="text-xs text-muted mt-0.5">{label}</span>
		</div>
	</div>

	<!-- Skip button -->
	<div class="sticky bottom-2 z-10 rounded-xl border border-theme bg-[rgb(var(--color-bg)/0.92)] backdrop-blur-sm p-2">
		<Button onclick={skip} variant="ghost" fullWidth={true}>
			{#snippet children()}
				Skip Rest
			{/snippet}
		</Button>
	</div>

	<!-- Next exercise preview -->
		{#if nextExercise}
			<div class="relative z-10 mt-1 p-3 surface-elevated rounded-xl border border-brand-soft text-left">
			<div class="flex items-center gap-2 mb-2">
				<span class="text-xs font-bold text-brand uppercase tracking-wide">Up Next</span>
			</div>
			<div class="flex items-center gap-2">
				<p class="text-base font-semibold text-primary">{nextExercise.name}</p>
				<ExerciseInfoButton
					exerciseName={nextExercise.name}
					equipment={nextExercise.equipment}
					notes={nextExercise.notes}
					size={18}
				/>
			</div>
			<p class="text-xs text-secondary mt-1">
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
				{#if nextLastPerformanceSummary}
					<div class="pt-2 mt-2 border-t border-[rgb(var(--color-border)/0.5)]">
						<p class="text-[11px] font-semibold uppercase tracking-wide text-secondary mb-1 flex items-center gap-1.5">
							<History size={12} />
							Last time
						</p>
						<p class="text-sm font-semibold text-primary break-words">{nextLastPerformanceSummary}</p>
					</div>
				{/if}
			</div>
		{/if}

		{#if currentLastPerformanceSummary}
			<div class="relative z-10 space-y-2 text-left">
				{#if currentLastPerformanceSummary}
					<div class="rounded-xl border border-theme bg-border-soft px-3 py-2.5">
						<p class="text-[11px] font-semibold uppercase tracking-wide text-secondary mb-1 flex items-center gap-1.5">
							<History size={12} />
							Last time
						</p>
						<p class="text-sm font-semibold text-primary break-words">{currentLastPerformanceSummary}</p>
					</div>
				{/if}
			</div>
		{/if}

	<div class="relative z-10 rounded-xl border border-theme surface-elevated p-3 space-y-2.5 text-left">
		<div class="flex items-start justify-between gap-2">
			<p class="text-xs font-semibold text-secondary uppercase tracking-wide flex items-center gap-1.5">
				<MessageSquare size={13} />
				Workout note
			</p>
			{#if onopennotes}
				<button
					type="button"
					onclick={onopennotes}
					class="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-brand-soft text-brand hover:opacity-90 transition-opacity touch-target"
				>
					{currentSessionNote ? 'Edit note' : 'Add note'}
				</button>
			{/if}
		</div>

		{#if currentExercise?.notes?.trim()}
			<p class="text-sm text-secondary whitespace-pre-wrap break-words">{currentExercise.notes}</p>
		{/if}

		{#if currentSessionNote}
			<div class="space-y-1.5">
				<p class="text-[11px] uppercase tracking-wide text-muted">This workout</p>
				<p class="text-sm text-primary whitespace-pre-wrap break-words">{currentSessionNote}</p>
			</div>
		{/if}

		{#if lastSessionNote}
			<div class="space-y-1.5 pt-2 border-t border-[rgb(var(--color-border)/0.5)]">
				<p class="text-[11px] uppercase tracking-wide text-muted">Last session note</p>
				<p class="text-xs text-secondary whitespace-pre-wrap break-words">{lastSessionNote}</p>
			</div>
		{:else if !currentSessionNote}
			<p class="text-xs text-secondary">No notes yet.</p>
		{/if}
	</div>
</div>
