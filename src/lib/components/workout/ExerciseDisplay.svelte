<script lang="ts">
	import type { Exercise } from '$lib/types/program';
	import type { ExerciseLog, SetLog } from '$lib/types/workout-session';
	import Card from '../shared/Card.svelte';
	import Button from '../shared/Button.svelte';
	import Input from '../shared/Input.svelte';
	import ExerciseInfoButton from '../shared/ExerciseInfoButton.svelte';
	import ExerciseTimer from './ExerciseTimer.svelte';
	import { formatExerciseReps, formatRestTime } from '$lib/utils/formatters';
	import { Check, Flame, Snowflake, Dumbbell, Trophy } from 'lucide-svelte';

	interface Props {
		exercise: Exercise;
		log: ExerciseLog;
		onsetcomplete: (setNumber: number, data?: { reps?: number; weight?: number; duration?: number }) => void;
		onsetupdate: (setNumber: number, data: { reps?: number; weight?: number; duration?: number }) => void;
		onnext: () => void;
		isLastExercise?: boolean;
		lastPerformance?: ExerciseLog;
	}

	let { exercise, log, onsetcomplete, onsetupdate, onnext, isLastExercise = false, lastPerformance }: Props = $props();

	// Parse default reps from exercise
	function getDefaultReps(): number | undefined {
		if (!exercise.reps) return undefined;
		const match = exercise.reps.match(/^(\d+)/);
		return match ? parseInt(match[1]) : undefined;
	}

	// Initialize input values for all sets
	function initSetInputs() {
		const inputs: Record<number, { reps?: number; weight?: number }> = {};
		for (const set of log.sets) {
			inputs[set.setNumber] = {
				reps: set.reps ?? getDefaultReps(),
				weight: set.weight
			};
		}
		return inputs;
	}

	let setInputs = $state(initSetInputs());

	// Re-init when exercise changes
	$effect(() => {
		exercise.id; // Track exercise changes
		setInputs = initSetInputs();
	});

	function completeSet(set: SetLog) {
		const input = setInputs[set.setNumber] || {};
		if (input.reps !== undefined || input.weight !== undefined) {
			for (const nextSet of log.sets) {
				if (nextSet.setNumber <= set.setNumber || nextSet.completed) continue;
				setInputs[nextSet.setNumber] = {
					...setInputs[nextSet.setNumber],
					reps: input.reps,
					weight: input.weight
				};
			}
		}

		onsetcomplete(set.setNumber, {
			reps: input.reps,
			weight: input.weight
		});
	}

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
			badgeClass: 'bg-warning-soft text-warning',
			iconClass: 'bg-warning-soft',
			iconColor: 'text-warning'
		},
		main: {
			icon: Dumbbell,
			label: 'MAIN',
			badgeClass: 'bg-brand-soft text-brand',
			iconClass: 'bg-brand-soft',
			iconColor: 'text-brand'
		},
		cooldown: {
			icon: Snowflake,
			label: 'COOL-DOWN',
			badgeClass: 'bg-success-soft text-success',
			iconClass: 'bg-success-soft',
			iconColor: 'text-success'
		}
	};

	const config = $derived(typeConfig[exercise.type] || typeConfig.main);

	function normalizeLabel(value: string): string {
		return value.toLowerCase().replace(/[^a-z0-9]/g, '');
	}

	const shouldShowExerciseNotes = $derived(() => {
		const notes = exercise.notes?.trim();
		if (!notes) return false;

		const normalized = normalizeLabel(notes);
		if (!normalized) return false;

		if (exercise.type === 'warmup' && normalized.startsWith('warmup')) return false;
		if (exercise.type === 'cooldown' && normalized.startsWith('cooldown')) return false;
		if (exercise.type === 'main' && (normalized === 'main' || normalized === 'workout')) return false;

		return true;
	});

	function formatLastPerformance(exerciseLog: ExerciseLog): string {
		const sets = exerciseLog.sets.filter(s => s.completed);
		if (sets.length === 0) return '';

		const reps = sets.map(s => s.reps).filter((r): r is number => r !== undefined);
		const weights = sets.map(s => s.weight).filter((w): w is number => w !== undefined);
		const durations = sets.map(s => s.duration).filter((d): d is number => d !== undefined);

		// Time-based exercise
		if (durations.length > 0 && reps.length === 0) {
			const totalDuration = durations.reduce((a, b) => a + b, 0);
			const mins = Math.floor(totalDuration / 60);
			const secs = totalDuration % 60;
			return mins > 0 ? `${sets.length} sets, ${mins}m ${secs}s` : `${sets.length} sets, ${secs}s`;
		}

		// No reps data
		if (reps.length === 0) return `${sets.length} sets`;

		const allSameReps = reps.every(r => r === reps[0]);
		const allSameWeight = weights.length === 0 || weights.every(w => w === weights[0]);

		if (allSameReps && allSameWeight) {
			const weightStr = weights.length > 0 ? ` @ ${weights[0]}kg` : '';
			return `${sets.length}×${reps[0]}${weightStr}`;
		}

		const minReps = Math.min(...reps);
		const maxReps = Math.max(...reps);
		const repsStr = minReps === maxReps ? `${minReps}` : `${minReps}-${maxReps}`;

		if (weights.length > 0) {
			const maxWeight = Math.max(...weights);
			return `${sets.length}×${repsStr} @ ${maxWeight}kg`;
		}

		return `${sets.length}×${repsStr}`;
	}
</script>

<div class="space-y-4 animate-slideUp">
	<!-- Exercise Info Card -->
	<div class="rounded-xl border border-brand-soft surface p-5 sm:p-6">
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
				{#if shouldShowExerciseNotes()}
					<p class="text-secondary mt-2">{exercise.notes}</p>
				{/if}
			</div>

			<!-- Equipment -->
			{#if exercise.equipment && exercise.equipment.length > 0}
				<div class="flex flex-wrap gap-2">
					{#each exercise.equipment as item}
						<span
							class="px-3 py-1.5 text-sm bg-brand-soft rounded-lg text-brand font-medium"
						>
							{item}
						</span>
					{/each}
				</div>
			{/if}

			<!-- Target info -->
			<div class="p-4 bg-brand-soft rounded-xl border border-brand-soft">
				<p class="text-xs font-bold text-brand uppercase tracking-wide mb-1">Target</p>
				<p class="text-2xl font-bold text-primary">
					{exercise.sets} sets x {formatExerciseReps(exercise.reps, exercise.duration)}
				</p>
				<p class="text-sm text-secondary mt-2">
					{formatRestTime(exercise.restBetweenSets)} between sets
				</p>
			</div>

			<!-- Last performance -->
			{#if lastPerformance}
				<div class="p-3 bg-border-soft rounded-xl border border-theme">
					<p class="text-xs font-medium text-secondary">
						Last time: <span class="text-primary font-semibold">{formatLastPerformance(lastPerformance)}</span>
					</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Sets Card / Timer -->
	{#if isTimeBased && nextIncompleteSet && effectiveDuration}
		<!-- Time-based exercise: show timer -->
		<!-- Auto-start if not first set and no rest between sets (coming from 10s transition) -->
		{#key nextIncompleteSet.setNumber}
			<ExerciseTimer
				duration={effectiveDuration}
				setNumber={nextIncompleteSet.setNumber}
				totalSets={exercise.sets}
				onsetcomplete={() => onsetcomplete(nextIncompleteSet.setNumber)}
				onskip={() => onsetcomplete(nextIncompleteSet.setNumber)}
				autoStart={nextIncompleteSet.setNumber > 1 && exercise.restBetweenSets === 0}
			/>
		{/key}
	{:else if !allSetsCompleted}
		<!-- Rep-based exercise: show set forms -->
		<Card padding="sm">
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<h3 class="font-semibold text-primary">Sets</h3>
					<span class="text-sm font-bold px-3 py-1 rounded-full bg-brand-soft text-brand">
						{completedCount}/{exercise.sets}
					</span>
				</div>

				<div class="space-y-2.5">
					{#each log.sets as set, index}
						<div
							class="p-2.5 sm:p-3 rounded-xl border transition-all duration-200 animate-scaleIn {set.completed
								? 'border-success-soft bg-success-soft'
								: 'border-brand-soft surface'}"
							style="animation-delay: {index * 50}ms"
						>
							{#if set.completed}
								<!-- Completed set display -->
								<div class="flex items-center gap-2.5">
									<div class="w-7 h-7 rounded-full bg-[rgb(var(--color-success))] flex items-center justify-center shadow-sm">
										<Check size={14} class="text-white" strokeWidth={3} />
									</div>
									<div class="flex-1">
										<span class="font-semibold text-sm text-success">Set {set.setNumber}</span>
										<span class="text-xs sm:text-sm text-secondary ml-2">
											{#if set.reps}{set.reps} reps{/if}
											{#if set.reps && set.weight} @ {/if}
											{#if set.weight}{set.weight} kg{/if}
											{#if !set.reps && !set.weight}Done{/if}
										</span>
									</div>
								</div>
							{:else}
								<!-- Active set form -->
								<div class="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-2.5">
									<span class="font-semibold text-primary text-sm whitespace-nowrap">
										Set {set.setNumber}
									</span>

									<div class="grid grid-cols-2 gap-2 min-w-0">
										<Input
											type="number"
											bind:value={setInputs[set.setNumber].reps}
											min="0"
											placeholder="Reps"
											containerClass="w-full"
											inputClass="px-2.5 py-1.5 min-h-[42px] text-center text-sm rounded-lg"
											inputMode="numeric"
										/>
										<Input
											type="number"
											bind:value={setInputs[set.setNumber].weight}
											min="0"
											step="0.5"
											placeholder="kg"
											containerClass="w-full"
											inputClass="px-2.5 py-1.5 min-h-[42px] text-center text-sm rounded-lg"
											inputMode="decimal"
										/>
									</div>

									<button
										type="button"
										onclick={() => completeSet(set)}
										class="min-h-[42px] min-w-[72px] px-3 py-2 bg-[rgb(var(--color-success))] hover:bg-[rgb(var(--color-success)/0.85)] text-black text-xs sm:text-sm font-semibold rounded-lg transition-colors active:scale-95"
									>
										Done
									</button>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</Card>
	{/if}

	<!-- Next Exercise / Finish Workout Button -->
	{#if allSetsCompleted}
		<div class="animate-slideUp">
			<Button onclick={onnext} fullWidth={true} size="lg">
				{#snippet children()}
					{#if isLastExercise}
						<Trophy size={20} />
						Finish Workout
						{:else}
							Next Exercise
						{/if}
					{/snippet}
				</Button>
		</div>
	{/if}
</div>
