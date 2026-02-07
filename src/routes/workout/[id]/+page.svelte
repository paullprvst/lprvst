<svelte:head>
	<title>Workout | AI Fitness Coach</title>
</svelte:head>

<script lang="ts">
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import { goto, beforeNavigate } from '$app/navigation';
	import { workoutStore } from '$lib/stores/workout-store.svelte';
	import { workoutSessionRepository } from '$lib/services/storage/workout-session-repository';
	import { programRepository } from '$lib/services/storage/program-repository';
	import { programVersionRepository } from '$lib/services/storage/program-version-repository';
	import type { Workout } from '$lib/types/program';
	import type { WorkoutSession } from '$lib/types/workout-session';
	import { featureFlags } from '$lib/utils/feature-flags';
	import ExerciseDisplay from '$lib/components/workout/ExerciseDisplay.svelte';
	import RestTimer from '$lib/components/workout/RestTimer.svelte';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import Card from '$lib/components/shared/Card.svelte';
	import Modal from '$lib/components/shared/Modal.svelte';
	import AlertBanner from '$lib/components/shared/AlertBanner.svelte';
	import { X, CheckCircle, Trophy, Clock, ChevronDown, ChevronUp, Dumbbell, Pause, Trash2 } from 'lucide-svelte';
	import { formatDuration } from '$lib/utils/date-helpers';

	let loading = $state(true);
	let loadError = $state('');
	let showCompleteModal = $state(false);
	let showLeaveModal = $state(false);
	let showPlan = $state(false);
	let elapsedSeconds = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | null = null;
	let allowNavigation = $state(false);

	// Prevent accidental navigation (back button, link clicks, etc.)
	beforeNavigate(({ cancel }) => {
		if (allowNavigation || loading || !workoutStore.session) return;
		showLeaveModal = true;
		cancel();
	});

	function openLeaveModal() {
		showLeaveModal = true;
	}

	async function leaveAndResumeLater() {
		// Session stays "in-progress" - user can resume from calendar
		allowNavigation = true;
		showLeaveModal = false;
		goto('/calendar');
	}

	async function leaveAndAbandon() {
		if (!workoutStore.session) return;
		await workoutSessionRepository.update(workoutStore.session.id, {
			status: 'abandoned'
		});
		allowNavigation = true;
		showLeaveModal = false;
		goto('/calendar');
	}

	function isExerciseCompleted(exerciseIndex: number): boolean {
		if (!workoutStore.session) return false;
		const exerciseLog = workoutStore.session.exercises[exerciseIndex];
		if (!exerciseLog) return false;
		return exerciseLog.sets.every(set => set.completed);
	}

	function formatExerciseTarget(exercise: { sets: number; reps?: string; duration?: number }): string {
		if (exercise.duration) {
			const mins = Math.floor(exercise.duration / 60);
			const secs = exercise.duration % 60;
			const timeStr = mins > 0 ? `${mins}m${secs > 0 ? ` ${secs}s` : ''}` : `${secs}s`;
			return `${exercise.sets} × ${timeStr}`;
		}
		return `${exercise.sets} × ${exercise.reps || '?'} reps`;
	}

	function buildWorkoutFromSession(session: WorkoutSession): Workout {
		return {
			id: session.workoutId,
			name: session.workoutNameSnapshot || 'Workout',
			type: 'mixed',
			estimatedDuration: 45,
			exercises: session.exercises.map((exerciseLog) => ({
				id: exerciseLog.exerciseId,
				name: exerciseLog.exerciseName || 'Exercise',
				sets: exerciseLog.sets.length || 1,
				restBetweenSets: 0,
				restBetweenExercises: 0,
				type: 'main'
			}))
		};
	}

	onMount(async () => {
		const sessionId = $page.params.id;
		if (!sessionId) {
			loadError = 'Invalid workout session ID.';
			loading = false;
			return;
		}
		const session = await workoutSessionRepository.get(sessionId);

		if (!session) {
			loadError = 'Workout session not found.';
			loading = false;
			return;
		}

		const program = await programRepository.get(session.programId);
		const version = featureFlags.programVersioningReads && session.programVersionId
			? await programVersionRepository.getById(session.programVersionId)
			: null;
		const effectiveProgram = version
			? {
					id: session.programId,
					userId: program?.userId,
					currentVersionId: version.id,
					createdAt: program?.createdAt ?? version.createdAt,
					updatedAt: program?.updatedAt ?? version.createdAt,
					...programVersionRepository.toProjection(version)
				}
			: program;

		if (!effectiveProgram) {
			loadError = 'Program not found for this workout session.';
			loading = false;
			return;
		}

		let workout = effectiveProgram.workouts.find((w) => w.id === session.workoutId);
		if (!workout) {
			workout = buildWorkoutFromSession(session);
		}
		if (!workout) {
			loadError = 'Workout definition not found.';
			loading = false;
			return;
		}

		workoutStore.setSession(session, workout);
		await workoutStore.loadLastPerformances();
		loading = false;

		// Start elapsed time timer
		const updateElapsed = () => {
			elapsedSeconds = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
		};
		updateElapsed();
		timerInterval = setInterval(updateElapsed, 1000);

		// Request wake lock
		try {
			if ('wakeLock' in navigator) {
				await (navigator as any).wakeLock.request('screen');
			}
		} catch (e) {
			console.log('Wake lock failed:', e);
		}
	});

	onDestroy(() => {
		workoutStore.clear();
		if (timerInterval) {
			clearInterval(timerInterval);
		}
	});

	function handleSetComplete(setNumber: number, data?: { reps?: number; weight?: number; duration?: number }) {
		workoutStore.completeSet(setNumber, data);
		saveSession();
	}

	function handleSetUpdate(setNumber: number, data: { reps?: number; weight?: number; duration?: number }) {
		workoutStore.updateSetData(setNumber, data);
		saveSession();
	}

	function handleNextExercise() {
		if (workoutStore.isLastExercise) {
			showCompleteModal = true;
		} else {
			workoutStore.nextExercise();
			saveSession();
		}
	}

	function handleRestComplete() {
		const wasExerciseRest = workoutStore.restType === 'exercise';
		workoutStore.completeRest();
		if (wasExerciseRest) {
			workoutStore.nextExercise();
		}
		saveSession();
	}

	async function saveSession() {
		if (!workoutStore.session) return;
		await workoutSessionRepository.update(workoutStore.session.id, {
			exercises: JSON.parse(JSON.stringify(workoutStore.session.exercises))
		});
	}

	async function completeWorkout() {
		if (!workoutStore.session) return;
		await workoutSessionRepository.complete(workoutStore.session.id);
		allowNavigation = true;
		goto('/history');
	}

</script>

{#if loading}
	<div class="flex justify-center py-12">
		<LoadingSpinner size="lg" />
	</div>
{:else if loadError}
	<Card>
		<div class="space-y-4 p-1">
			<AlertBanner variant="error" title="Unable to load workout" message={loadError} />
			<Button onclick={() => goto('/calendar')} fullWidth>
				{#snippet children()}
					Back to Calendar
				{/snippet}
			</Button>
		</div>
	</Card>
{:else if workoutStore.workout && workoutStore.currentExercise && workoutStore.currentExerciseLog}
	<div class="space-y-4">
		<!-- Header -->
		<div class="flex items-center justify-between gap-4">
			<div class="flex-1 min-w-0">
				<h1 class="text-xl font-bold text-primary truncate">{workoutStore.workout.name}</h1>
				<div class="flex items-center gap-3 text-sm text-secondary">
					<span>Exercise {workoutStore.currentExerciseIndex + 1} of {workoutStore.workout.exercises.length}</span>
					<span class="text-[rgb(var(--color-border))]">|</span>
					<span class="flex items-center gap-1">
						<Clock size={14} />
						{formatDuration(elapsedSeconds)}
					</span>
				</div>
			</div>
			<button
				onclick={openLeaveModal}
				class="p-2 rounded-xl text-muted hover:text-primary hover:bg-border-soft transition-colors duration-200 touch-target"
				aria-label="Close workout"
			>
				<X size={24} />
			</button>
		</div>

		<!-- Progress bar -->
		<div class="w-full surface-elevated rounded-full h-2 overflow-hidden">
			<div
				class="bg-[rgb(var(--color-primary))] h-full transition-all duration-300 ease-out"
				style="width: {workoutStore.progress}%"
			></div>
		</div>

		<!-- Session Plan (Collapsible) -->
		<div class="card">
			<button
				onclick={() => showPlan = !showPlan}
				class="w-full flex items-center justify-between p-3 text-left"
			>
				<div class="flex items-center gap-2 text-sm font-medium text-secondary">
					<Dumbbell size={16} />
					<span>Session Plan</span>
				</div>
				{#if showPlan}
					<ChevronUp size={18} class="text-muted" />
				{:else}
					<ChevronDown size={18} class="text-muted" />
				{/if}
			</button>

			{#if showPlan}
				<div class="border-t border-[rgb(var(--color-border))] px-3 pb-3">
					<div class="space-y-2 pt-3">
						{#each workoutStore.workout.exercises as exercise, index}
							{@const isCurrent = index === workoutStore.currentExerciseIndex}
							{@const isCompleted = isExerciseCompleted(index)}
							<div
								class="flex items-center gap-3 p-2 rounded-lg transition-colors {isCurrent ? 'bg-[rgb(var(--color-primary))]/10 border border-[rgb(var(--color-primary))]/30' : ''}"
							>
								<div class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
									{isCompleted ? 'bg-success-soft text-success' : isCurrent ? 'bg-brand-soft text-brand' : 'bg-border-soft text-muted'}">
									{#if isCompleted}
										<CheckCircle size={14} />
									{:else}
										{index + 1}
									{/if}
								</div>
								<div class="flex-1 min-w-0">
									<div class="text-sm font-medium text-primary truncate {isCompleted ? 'line-through opacity-60' : ''}">
										{exercise.name}
									</div>
									<div class="text-xs text-muted">
										{formatExerciseTarget(exercise)}
									</div>
								</div>
								{#if isCurrent}
									<span class="text-xs font-medium text-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]/10 px-2 py-0.5 rounded-full">
										Current
									</span>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Main content -->
		{#if workoutStore.resting}
			<RestTimer
				duration={workoutStore.restDuration}
				oncomplete={handleRestComplete}
				label={workoutStore.restType === 'set'
					? 'Rest before next set'
					: 'Rest before next exercise'}
				nextExercise={workoutStore.restType === 'exercise' ? workoutStore.upcomingExercise : null}
			/>
		{:else}
			<ExerciseDisplay
				exercise={workoutStore.currentExercise}
				log={workoutStore.currentExerciseLog}
				onsetcomplete={handleSetComplete}
				onsetupdate={handleSetUpdate}
				onnext={handleNextExercise}
				isLastExercise={workoutStore.isLastExercise}
				lastPerformance={workoutStore.getLastPerformance(workoutStore.currentExercise.name)}
			/>
		{/if}
	</div>

	<!-- Completion modal -->
	<Modal bind:open={showCompleteModal} size="sm">
		<div class="text-center space-y-6 py-4">
			<div
				class="w-20 h-20 mx-auto rounded-full bg-success-soft flex items-center justify-center"
			>
				<Trophy size={40} class="text-success" />
			</div>

			<div class="space-y-2">
				<h2 class="text-2xl font-bold text-primary">Workout Complete!</h2>
				<p class="text-secondary">
					Great job finishing <span class="font-medium">{workoutStore.workout.name}</span>.
				</p>
				<div class="flex items-center justify-center gap-1 text-lg font-semibold text-[rgb(var(--color-primary))]">
					<Clock size={18} />
					{formatDuration(elapsedSeconds)}
				</div>
			</div>

			<Button onclick={completeWorkout} fullWidth={true} size="lg">
				{#snippet children()}
					<CheckCircle size={20} />
					Finish Workout
				{/snippet}
			</Button>
		</div>
	</Modal>

	<!-- Leave workout modal -->
	<Modal bind:open={showLeaveModal} size="sm">
		<div class="space-y-6 py-4">
			<div class="text-center space-y-2">
				<h2 class="text-xl font-bold text-primary">Leave Workout?</h2>
				<p class="text-secondary text-sm">
					Your progress has been saved. What would you like to do?
				</p>
			</div>

			<div class="space-y-3">
				<button
					onclick={leaveAndResumeLater}
					class="w-full flex items-center gap-4 p-4 rounded-xl border border-theme hover:bg-border-soft transition-colors text-left"
				>
					<div class="w-10 h-10 rounded-full bg-warning-soft flex items-center justify-center flex-shrink-0">
						<Pause size={20} class="text-warning" />
					</div>
					<div>
						<p class="font-medium text-primary">Resume later</p>
						<p class="text-sm text-secondary">Continue this workout from where you left off</p>
					</div>
				</button>

				<button
					onclick={leaveAndAbandon}
					class="w-full flex items-center gap-4 p-4 rounded-xl border border-theme hover:bg-border-soft transition-colors text-left"
				>
					<div class="w-10 h-10 rounded-full bg-error-soft flex items-center justify-center flex-shrink-0">
						<Trash2 size={20} class="text-error" />
					</div>
					<div>
						<p class="font-medium text-primary">Abandon workout</p>
						<p class="text-sm text-secondary">Discard this session permanently</p>
					</div>
				</button>
			</div>

			<button
				onclick={() => showLeaveModal = false}
				class="w-full py-2 text-sm text-secondary hover:text-primary transition-colors"
			>
				Cancel
			</button>
		</div>
	</Modal>
{/if}
