<script lang="ts">
	import type { Exercise } from '$lib/types/program';
	import type { ExerciseLog } from '$lib/types/workout-session';
	import Card from '../shared/Card.svelte';
	import Button from '../shared/Button.svelte';
	import ExerciseInfoButton from '../shared/ExerciseInfoButton.svelte';
	import ExerciseTimer from './ExerciseTimer.svelte';
	import { formatExerciseReps, formatRestTime } from '$lib/utils/formatters';
	import { Check, ArrowRight, Flame, Snowflake, Dumbbell } from 'lucide-svelte';

	interface Props {
		exercise: Exercise;
		log: ExerciseLog;
		onsetcomplete: (setNumber: number) => void;
		onnext: () => void;
	}

	let { exercise, log, onsetcomplete, onnext }: Props = $props();

	const allSetsCompleted = $derived(log.sets.every((s) => s.completed));
	const completedCount = $derived(log.sets.filter((s) => s.completed).length);
	const nextIncompleteSet = $derived(log.sets.find((s) => !s.completed));

	// Parse time duration from reps string (e.g., "2 minutes", "30 seconds", "90 sec")
	function parseTimeDuration(reps?: string): number | null {
		if (!reps) return null;

		const minuteMatch = reps.match(/(\d+\.?\d*)\s*(minutes?|min|m)\b/i);
		if (minuteMatch) {
			return Math.round(parseFloat(minuteMatch[1]) * 60);
		}

		const secondMatch = reps.match(/(\d+\.?\d*)\s*(seconds?|sec|s)\b/i);
		if (secondMatch) {
			return Math.round(parseFloat(secondMatch[1]));
		}

		return null;
	}

	// Get duration from either the duration field or parsed from reps string
	const effectiveDuration = $derived(exercise.duration || parseTimeDuration(exercise.reps));
	const isTimeBased = $derived(effectiveDuration && effectiveDuration > 0);

	const typeConfig = {
		warmup: {
			icon: Flame,
			label: 'WARM-UP',
			badgeClass: 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
			iconClass: 'bg-orange-500/20',
			iconColor: 'text-orange-500 dark:text-orange-400'
		},
		main: {
			icon: Dumbbell,
			label: 'MAIN',
			badgeClass: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400',
			iconClass: 'bg-cyan-500/20',
			iconColor: 'text-cyan-500 dark:text-cyan-400'
		},
		cooldown: {
			icon: Snowflake,
			label: 'COOL-DOWN',
			badgeClass: 'bg-sky-500/20 text-sky-600 dark:text-sky-400',
			iconClass: 'bg-sky-500/20',
			iconColor: 'text-sky-500 dark:text-sky-400'
		}
	};

	const config = $derived(typeConfig[exercise.type] || typeConfig.main);
</script>

<div class="space-y-4 animate-slideUp">
	<!-- Exercise Info Card -->
	<div class="rounded-2xl border border-cyan-300 dark:border-cyan-500/40 overflow-hidden">
		<Card padding="lg">
			<div class="space-y-5">
				<!-- Type badge and title -->
				<div>
					{#if exercise.type !== 'main'}
						<div
							class="inline-flex items-center gap-1.5 px-3 py-1 {config.badgeClass} text-xs font-semibold rounded-full mb-3"
						>
							<config.icon size={12} />
							{config.label}
						</div>
					{/if}
					<div class="flex items-center gap-2">
						<h2 class="text-2xl font-bold text-primary">{exercise.name}</h2>
						<ExerciseInfoButton
							exerciseName={exercise.name}
							equipment={exercise.equipment}
							notes={exercise.notes}
							size={22}
						/>
					</div>
					{#if exercise.notes}
						<p class="text-secondary mt-2">{exercise.notes}</p>
					{/if}
				</div>

				<!-- Equipment -->
				{#if exercise.equipment && exercise.equipment.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each exercise.equipment as item}
							<span
								class="px-3 py-1.5 text-sm bg-cyan-500/20 rounded-lg text-cyan-700 dark:text-cyan-300 font-medium"
							>
								{item}
							</span>
						{/each}
					</div>
				{/if}

				<!-- Target info -->
				<div class="p-4 bg-gradient-to-br from-cyan-500/15 to-pink-500/15 dark:from-cyan-500/25 dark:to-pink-500/25 rounded-xl border border-cyan-300 dark:border-cyan-500/40">
					<p class="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wide mb-1">Target</p>
					<p class="text-2xl font-bold text-primary">
						{exercise.sets} sets x {formatExerciseReps(exercise.reps, exercise.duration)}
					</p>
					<p class="text-sm text-secondary mt-2">
						{formatRestTime(exercise.restBetweenSets)} between sets
					</p>
				</div>
			</div>
		</Card>
	</div>

	<!-- Sets Card / Timer -->
	{#if isTimeBased && nextIncompleteSet && effectiveDuration}
		<!-- Time-based exercise: show timer -->
		<ExerciseTimer
			duration={effectiveDuration}
			setNumber={nextIncompleteSet.setNumber}
			totalSets={exercise.sets}
			onsetcomplete={() => onsetcomplete(nextIncompleteSet.setNumber)}
			onskip={() => onsetcomplete(nextIncompleteSet.setNumber)}
		/>
	{:else if !allSetsCompleted}
		<!-- Rep-based exercise: show set buttons -->
		<Card>
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<h3 class="font-semibold text-primary">Sets</h3>
					<span class="text-sm font-bold px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-400">
						{completedCount}/{exercise.sets}
					</span>
				</div>

				<div class="grid grid-cols-2 gap-3">
					{#each log.sets as set, index}
						<button
							onclick={() => onsetcomplete(set.setNumber)}
							class="relative flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 transition-all duration-200 touch-target overflow-hidden group animate-scaleIn active:scale-95 {set.completed
								? 'border-green-400 bg-green-500/15 dark:border-green-400 dark:bg-green-500/20'
								: 'border-cyan-300 dark:border-cyan-500/50 surface hover:border-cyan-400 dark:hover:border-cyan-400 hover:bg-cyan-500/10 dark:hover:bg-cyan-500/15'}"
							style="animation-delay: {index * 50}ms"
						>
							<!-- Checkmark animation -->
							{#if set.completed}
								<div
									class="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shadow-sm animate-scaleIn"
								>
									<Check size={16} class="text-white" strokeWidth={3} />
								</div>
							{:else}
								<div
									class="w-7 h-7 rounded-full border-2 border-cyan-400 dark:border-cyan-400 group-hover:border-cyan-500 transition-colors duration-200"
								></div>
							{/if}

							<span
								class="font-semibold transition-colors duration-200 {set.completed
									? 'text-green-600 dark:text-green-400'
									: 'text-primary'}"
							>
								Set {set.setNumber}
							</span>

							<!-- Ripple effect on complete -->
							{#if set.completed}
								<div
									class="absolute inset-0 bg-green-500/5 pointer-events-none"
								></div>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		</Card>
	{/if}

	<!-- Next Exercise Button -->
	{#if allSetsCompleted}
		<div class="animate-slideUp">
			<Button onclick={onnext} fullWidth={true} size="lg">
				{#snippet children()}
					Next Exercise
					<ArrowRight size={20} />
				{/snippet}
			</Button>
		</div>
	{/if}
</div>
