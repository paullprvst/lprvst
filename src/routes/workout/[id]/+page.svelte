<script lang="ts">
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { workoutStore } from '$lib/stores/workout-store.svelte';
	import { workoutSessionRepository } from '$lib/services/storage/workout-session-repository';
	import { programRepository } from '$lib/services/storage/program-repository';
	import ExerciseDisplay from '$lib/components/workout/ExerciseDisplay.svelte';
	import RestTimer from '$lib/components/workout/RestTimer.svelte';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import Card from '$lib/components/shared/Card.svelte';
	import Modal from '$lib/components/shared/Modal.svelte';
	import { X, CheckCircle, Trophy } from 'lucide-svelte';

	let loading = $state(true);
	let showCompleteModal = $state(false);

	onMount(async () => {
		const sessionId = $page.params.id;
		if (!sessionId) {
			alert('Invalid session ID');
			goto('/calendar');
			return;
		}
		const session = await workoutSessionRepository.get(sessionId);

		if (!session) {
			alert('Workout session not found');
			goto('/calendar');
			return;
		}

		const program = await programRepository.get(session.programId);
		if (!program) {
			alert('Program not found');
			goto('/calendar');
			return;
		}

		const workout = program.workouts.find((w) => w.id === session.workoutId);
		if (!workout) {
			alert('Workout not found');
			goto('/calendar');
			return;
		}

		workoutStore.setSession(session, workout);
		loading = false;

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
	});

	function handleSetComplete(setNumber: number) {
		workoutStore.completeSet(setNumber);
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
		goto('/history');
	}

	async function abandonWorkout() {
		if (!confirm('Are you sure you want to abandon this workout?')) return;
		if (!workoutStore.session) return;
		await workoutSessionRepository.update(workoutStore.session.id, {
			status: 'abandoned'
		});
		goto('/calendar');
	}
</script>

{#if loading}
	<div class="flex justify-center py-12">
		<LoadingSpinner size="lg" />
	</div>
{:else if workoutStore.workout && workoutStore.currentExercise && workoutStore.currentExerciseLog}
	<div class="space-y-4">
		<!-- Header -->
		<div class="flex items-center justify-between gap-4">
			<div class="flex-1 min-w-0">
				<h1 class="text-xl font-bold text-primary truncate">{workoutStore.workout.name}</h1>
				<p class="text-sm text-secondary">
					Exercise {workoutStore.currentExerciseIndex + 1} of {workoutStore.workout.exercises
						.length}
				</p>
			</div>
			<button
				onclick={abandonWorkout}
				class="p-2 rounded-xl text-muted hover:text-primary hover:bg-gray-500/10 transition-colors duration-200 touch-target"
				aria-label="Close workout"
			>
				<X size={24} />
			</button>
		</div>

		<!-- Progress bar -->
		<div class="w-full surface-elevated rounded-full h-2 overflow-hidden">
			<div
				class="bg-blue-500 h-full transition-all duration-300 ease-out"
				style="width: {workoutStore.progress}%"
			></div>
		</div>

		<!-- Main content -->
		{#if workoutStore.resting}
			<RestTimer
				duration={workoutStore.restDuration}
				oncomplete={handleRestComplete}
				label={workoutStore.restType === 'set'
					? 'Rest before next set'
					: 'Rest before next exercise'}
			/>
		{:else}
			<ExerciseDisplay
				exercise={workoutStore.currentExercise}
				log={workoutStore.currentExerciseLog}
				onsetcomplete={handleSetComplete}
				onnext={handleNextExercise}
			/>
		{/if}
	</div>

	<!-- Completion modal -->
	<Modal bind:open={showCompleteModal} size="sm">
		<div class="text-center space-y-6 py-4">
			<div
				class="w-20 h-20 mx-auto rounded-full bg-green-500/10 flex items-center justify-center"
			>
				<Trophy size={40} class="text-green-500" />
			</div>

			<div class="space-y-2">
				<h2 class="text-2xl font-bold text-primary">Workout Complete!</h2>
				<p class="text-secondary">
					Great job finishing <span class="font-medium">{workoutStore.workout.name}</span>.
				</p>
			</div>

			<Button onclick={completeWorkout} fullWidth={true} size="lg">
				{#snippet children()}
					<CheckCircle size={20} />
					Finish Workout
				{/snippet}
			</Button>
		</div>
	</Modal>
{/if}
