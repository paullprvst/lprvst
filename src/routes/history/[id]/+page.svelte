<svelte:head>
	<title>Workout Details | AI Fitness Coach</title>
</svelte:head>

<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { workoutSessionRepository } from '$lib/services/storage/workout-session-repository';
	import { programRepository } from '$lib/services/storage/program-repository';
	import type { WorkoutSession, SetLog } from '$lib/types/workout-session';
	import type { Program, Workout, Exercise } from '$lib/types/program';
	import Card from '$lib/components/shared/Card.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';
	import { formatDate, formatDuration } from '$lib/utils/date-helpers';
	import { ArrowLeft, Clock, CheckCircle, XCircle, Save, Pencil } from 'lucide-svelte';

	let session = $state<WorkoutSession | null>(null);
	let workout = $state<Workout | null>(null);
	let program = $state<Program | null>(null);
	let loading = $state(true);
	let saving = $state(false);
	let editingSet = $state<{ exerciseIndex: number; setIndex: number } | null>(null);
	let editValues = $state<{ reps?: number; weight?: number }>({ reps: undefined, weight: undefined });

	onMount(async () => {
		const sessionId = $page.params.id;
		if (!sessionId) {
			goto('/history');
			return;
		}

		const loadedSession = await workoutSessionRepository.get(sessionId);
		if (!loadedSession) {
			goto('/history');
			return;
		}

		const loadedProgram = await programRepository.get(loadedSession.programId);
		const loadedWorkout = loadedProgram?.workouts.find((w) => w.id === loadedSession.workoutId);

		session = loadedSession;
		program = loadedProgram || null;
		workout = loadedWorkout || null;
		loading = false;
	});

	function getDuration(): number {
		if (!session?.completedAt) return 0;
		return Math.floor((session.completedAt.getTime() - session.startedAt.getTime()) / 1000);
	}

	function getExerciseById(exerciseId: string): Exercise | undefined {
		return workout?.exercises.find((e) => e.id === exerciseId);
	}

	function getTotalSets(): number {
		return session?.exercises.reduce((total, ex) => total + ex.sets.length, 0) ?? 0;
	}

	function getCompletedSets(): number {
		return session?.exercises.reduce(
			(total, ex) => total + ex.sets.filter((s) => s.completed).length,
			0
		) ?? 0;
	}

	function startEditing(exerciseIndex: number, setIndex: number, set: SetLog) {
		editingSet = { exerciseIndex, setIndex };
		editValues = { reps: set.reps, weight: set.weight };
	}

	function cancelEditing() {
		editingSet = null;
		editValues = { reps: undefined, weight: undefined };
	}

	async function saveSetEdit() {
		if (!session || !editingSet) return;

		saving = true;
		const { exerciseIndex, setIndex } = editingSet;

		// Update the local state
		session.exercises[exerciseIndex].sets[setIndex] = {
			...session.exercises[exerciseIndex].sets[setIndex],
			reps: editValues.reps,
			weight: editValues.weight
		};

		// Persist to database
		await workoutSessionRepository.update(session.id, {
			exercises: JSON.parse(JSON.stringify(session.exercises))
		});

		saving = false;
		editingSet = null;
		editValues = { reps: undefined, weight: undefined };
	}

	const inputClasses = `
		w-20 px-3 py-2 text-center
		bg-[rgb(var(--color-surface))]
		border border-[rgb(var(--color-border))]
		rounded-lg text-sm
		text-[rgb(var(--color-text-primary))]
		input-focus-ring
	`;
</script>

<div class="space-y-6 animate-slideUp">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<button
			onclick={() => goto('/history')}
			class="p-2 rounded-xl hover:bg-gray-500/10 transition-colors"
			aria-label="Back to history"
		>
			<ArrowLeft size={24} class="text-primary" />
		</button>
		<h1 class="text-xl font-bold text-primary">Workout Details</h1>
	</div>

	{#if loading}
		<div class="flex justify-center py-12">
			<LoadingSpinner size="lg" />
		</div>
	{:else if session}
		<!-- Summary Card -->
		<Card>
			<div class="space-y-4">
				<div class="flex items-start gap-4">
					<div
						class="flex-shrink-0 w-12 h-12 rounded-xl bg-[rgb(var(--color-success)/0.1)] flex items-center justify-center"
					>
						<CheckCircle size={24} class="text-[rgb(var(--color-success))]" />
					</div>
					<div class="flex-1 min-w-0">
						<h2 class="text-lg font-bold text-primary">{workout?.name || 'Deleted workout'}</h2>
						<p class="text-sm text-secondary">{program?.name || 'Deleted program'}</p>
					</div>
				</div>

				<div class="grid grid-cols-3 gap-4 pt-2 border-t border-[rgb(var(--color-border))]">
					<div class="text-center">
						<p class="text-xs text-muted uppercase tracking-wide">Date</p>
						<p class="font-semibold text-primary mt-1">
							{formatDate(session.completedAt || session.startedAt, 'MMM d, yyyy')}
						</p>
					</div>
					<div class="text-center">
						<p class="text-xs text-muted uppercase tracking-wide">Duration</p>
						<p class="font-semibold text-primary mt-1 flex items-center justify-center gap-1">
							<Clock size={14} />
							{formatDuration(getDuration())}
						</p>
					</div>
					<div class="text-center">
						<p class="text-xs text-muted uppercase tracking-wide">Sets</p>
						<p class="font-semibold text-primary mt-1">
							{getCompletedSets()}/{getTotalSets()}
						</p>
					</div>
				</div>
			</div>
		</Card>

		<!-- Exercises -->
		<div class="space-y-4">
			<h3 class="text-lg font-semibold text-primary">Exercises</h3>

			{#each session.exercises as exerciseLog, exerciseIndex}
				{@const exercise = getExerciseById(exerciseLog.exerciseId)}
				<Card>
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<h4 class="font-semibold text-primary">{exercise?.name || 'Unknown exercise'}</h4>
							{#if exerciseLog.skipped}
								<span class="text-xs px-2 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full">
									Skipped
								</span>
							{/if}
						</div>

							<!-- Sets -->
							<div class="space-y-2">
								{#each exerciseLog.sets as set, setIndex}
									{@const isEditing = editingSet?.exerciseIndex === exerciseIndex && editingSet?.setIndex === setIndex}
									<div
										class="flex items-center gap-3 p-3 rounded-xl {set.completed
											? 'bg-green-500/10 border border-green-400/30'
											: 'bg-gray-500/10 border border-gray-400/30'}"
									>
										{#if set.completed}
											<CheckCircle size={18} class="text-green-500 flex-shrink-0" />
										{:else}
											<XCircle size={18} class="text-gray-400 flex-shrink-0" />
										{/if}

										<span class="font-medium text-primary w-14">Set {set.setNumber}</span>

										{#if isEditing}
											<!-- Edit mode -->
											<div class="flex-1 flex items-center gap-2">
												<input
													type="number"
													bind:value={editValues.reps}
													min="0"
													placeholder="Reps"
													class={inputClasses}
												/>
												<span class="text-muted text-sm">@</span>
												<input
													type="number"
													bind:value={editValues.weight}
													min="0"
													step="0.5"
													placeholder="kg"
													class={inputClasses}
												/>
											</div>
											<div class="flex items-center gap-1">
												<button
													onclick={saveSetEdit}
													disabled={saving}
													class="p-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-50"
													aria-label="Save"
												>
													<Save size={16} />
												</button>
												<button
													onclick={cancelEditing}
													class="p-2 rounded-lg bg-gray-500/20 hover:bg-gray-500/30 text-primary transition-colors"
													aria-label="Cancel"
												>
													<XCircle size={16} />
												</button>
											</div>
										{:else}
											<!-- View mode -->
											<div class="flex-1 text-sm text-secondary">
												{#if set.reps}{set.reps} reps{/if}
												{#if set.reps && set.weight} @ {/if}
												{#if set.weight}{set.weight} kg{/if}
												{#if !set.reps && !set.weight && set.completed}Done{/if}
												{#if !set.completed}—{/if}
											</div>
											{#if set.completed}
												<button
													onclick={() => startEditing(exerciseIndex, setIndex, set)}
													class="p-2 rounded-lg hover:bg-gray-500/20 text-muted hover:text-primary transition-colors"
													aria-label="Edit set"
												>
													<Pencil size={16} />
												</button>
											{/if}
										{/if}
									</div>
								{/each}
							</div>

							{#if exerciseLog.notes}
								<p class="text-sm text-secondary italic">{exerciseLog.notes}</p>
							{/if}
						</div>
					</Card>
			{/each}
		</div>
	{/if}
</div>
