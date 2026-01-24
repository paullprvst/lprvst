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
	import { X, CheckCircle } from 'lucide-svelte';

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

		const workout = program.workouts.find(w => w.id === session.workoutId);
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
		workoutStore.completeRest();
		workoutStore.nextExercise();
		saveSession();
	}

	async function saveSession() {
		if (!workoutStore.session) return;
		await workoutSessionRepository.update(workoutStore.session.id, {
			exercises: workoutStore.session.exercises
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
		<div class="flex items-center justify-between">
			<div class="flex-1">
				<h1 class="text-xl font-bold">{workoutStore.workout.name}</h1>
				<p class="text-sm text-gray-600">
					Exercise {workoutStore.currentExerciseIndex + 1} of {workoutStore.workout.exercises.length}
				</p>
			</div>
			<button
				onclick={abandonWorkout}
				class="text-gray-600 hover:text-gray-900 touch-target"
			>
				<X size={24} />
			</button>
		</div>

		<div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
			<div
				class="bg-blue-600 h-full transition-all"
				style="width: {workoutStore.progress}%"
			></div>
		</div>

		{#if workoutStore.resting}
			<RestTimer
				duration={workoutStore.restDuration}
				oncomplete={handleRestComplete}
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

	{#if showCompleteModal}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
			<Card padding="lg">
				<div class="text-center space-y-4 max-w-md">
					<div class="flex justify-center">
						<CheckCircle size={64} class="text-green-600" />
					</div>
					<h2 class="text-2xl font-bold">Workout Complete!</h2>
					<p class="text-gray-600">
						Great job! You've completed {workoutStore.workout.name}.
					</p>
					<Button onclick={completeWorkout} fullWidth={true} size="lg">
						{#snippet children()}
							Finish Workout
						{/snippet}
					</Button>
				</div>
			</Card>
		</div>
	{/if}
{/if}
