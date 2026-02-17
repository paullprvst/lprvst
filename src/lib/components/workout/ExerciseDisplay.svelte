<script lang="ts">
	import type { Exercise } from '$lib/types/program';
	import type { ExerciseLog, SetLog } from '$lib/types/workout-session';
	import Card from '../shared/Card.svelte';
	import Button from '../shared/Button.svelte';
	import Input from '../shared/Input.svelte';
	import ExerciseInfoButton from '../shared/ExerciseInfoButton.svelte';
	import ExerciseTimer from './ExerciseTimer.svelte';
	import {
		formatExercisePerformanceFull,
		formatExerciseReps,
		formatRestTime
	} from '$lib/utils/formatters';
	import { Check, Flame, Snowflake, Dumbbell, Trophy, MessageSquare } from 'lucide-svelte';

	interface Props {
		exercise: Exercise;
		log: ExerciseLog;
		onsetcomplete: (setNumber: number, data?: { reps?: number; weight?: number; duration?: number }) => void;
		onsetupdate: (setNumber: number, data: { reps?: number; weight?: number; duration?: number }) => void;
		onnext: () => void;
		onopennotes: () => void;
		isLastExercise?: boolean;
		lastPerformance?: ExerciseLog;
	}

	let {
		exercise,
		log,
		onsetcomplete,
		onsetupdate,
		onnext,
		onopennotes,
		isLastExercise = false,
		lastPerformance
	}: Props = $props();

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
		return formatExercisePerformanceFull(exerciseLog);
	}

	const currentSessionNote = $derived(log.notes?.trim() || '');
	const lastSessionNote = $derived(lastPerformance?.notes?.trim() || '');
</script>

<div class="space-y-4 animate-slideUp">
	<!-- Action context -->
	<div class="rounded-xl border border-brand-soft surface p-4 sm:p-5 space-y-3.5">
		<div class="min-w-0">
			{#if exercise.type !== 'main'}
				<div
					class="inline-flex items-center gap-1.5 px-2.5 py-1 {config.badgeClass} text-[11px] font-semibold rounded-full mb-2"
				>
					<config.icon size={11} />
					{config.label}
				</div>
			{/if}
			<div class="flex items-center gap-2">
				<h2 class="text-xl sm:text-2xl font-bold text-primary truncate">{exercise.name}</h2>
				<ExerciseInfoButton
					exerciseName={exercise.name}
					equipment={exercise.equipment}
					notes={exercise.notes}
					size={20}
				/>
			</div>
		</div>

		<div class="grid gap-2 sm:grid-cols-2">
			<div class="rounded-lg border border-brand-soft bg-brand-soft px-3 py-2.5">
				<p class="text-[11px] font-bold uppercase tracking-wide text-brand mb-1">Target</p>
				<p class="text-sm font-semibold text-primary">
					{exercise.sets} sets x {formatExerciseReps(exercise.reps, exercise.duration)}
				</p>
				<p class="text-xs text-secondary mt-1">
					{formatRestTime(exercise.restBetweenSets)} between sets
				</p>
			</div>

			{#if lastPerformance}
				<div class="rounded-lg border border-theme bg-border-soft px-3 py-2.5">
					<p class="text-[11px] font-semibold uppercase tracking-wide text-secondary mb-1">Last time</p>
					<p class="text-sm font-semibold text-primary">{formatLastPerformance(lastPerformance)}</p>
					{#if lastSessionNote}
						<p class="text-xs text-secondary mt-1.5 break-words">
							Last note: <span class="text-primary">{lastSessionNote}</span>
						</p>
					{/if}
				</div>
			{:else}
				<div class="rounded-lg border border-theme bg-border-soft px-3 py-2.5">
					<p class="text-xs text-secondary">No previous performance logged yet.</p>
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
							class="p-2 sm:p-2.5 rounded-xl border transition-all duration-200 animate-scaleIn {set.completed
								? 'border-success-soft bg-success-soft'
								: 'border-brand-soft surface'}"
							style="animation-delay: {index * 50}ms"
						>
							{#if set.completed}
								<!-- Completed set compact summary -->
								<div class="flex items-center gap-2 text-sm">
									<Check size={14} class="text-success flex-shrink-0" strokeWidth={3} />
									<p class="text-primary min-w-0 truncate">
										<span class="font-semibold text-success">Set {set.setNumber}</span>
										<span class="text-secondary">
											&nbsp;•&nbsp;
											{#if set.reps}{set.reps} reps{/if}
											{#if set.reps && set.weight} @ {/if}
											{#if set.weight}{set.weight} kg{/if}
											{#if !set.reps && !set.weight}Done{/if}
										</span>
									</p>
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
		<div class="sticky bottom-2 z-10 rounded-xl border border-theme bg-[rgb(var(--color-bg)/0.92)] backdrop-blur-sm p-2 animate-slideUp">
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

	<!-- Secondary context at the bottom -->
	<div class="rounded-xl border border-theme surface-elevated p-3.5 space-y-3">
		{#if shouldShowExerciseNotes()}
			<p class="text-sm text-secondary whitespace-pre-wrap break-words">{exercise.notes}</p>
		{/if}

		{#if exercise.equipment && exercise.equipment.length > 0}
			<div class="flex flex-wrap gap-1.5">
				{#each exercise.equipment as item}
					<span class="px-2.5 py-1 text-xs bg-brand-soft rounded-md text-brand font-medium">
						{item}
					</span>
				{/each}
			</div>
		{/if}

		<div class="space-y-2.5 pt-1">
			<div class="flex items-start justify-between gap-2">
				<p class="text-xs font-semibold text-secondary uppercase tracking-wide flex items-center gap-1.5">
					<MessageSquare size={13} />
					Workout note
				</p>
				<button
					type="button"
					onclick={onopennotes}
					class="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-brand-soft text-brand hover:opacity-90 transition-opacity touch-target"
				>
					{currentSessionNote ? 'Edit note' : 'Add note'}
				</button>
			</div>

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
				<div class="text-center py-4">
					<div class="w-8 h-8 mx-auto rounded-full bg-[rgb(var(--color-primary)/0.16)] flex items-center justify-center mb-2">
						<MessageSquare size={15} class="text-brand" />
					</div>
					<p class="text-sm font-semibold text-primary">No notes yet</p>
					<p class="text-xs text-secondary mt-1">
						Add a quick cue for form, setup, or target weight before moving on.
					</p>
				</div>
			{/if}
		</div>
	</div>
</div>
