<svelte:head>
	<title>Workout Details | AI Fitness Coach</title>
</svelte:head>

<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { workoutSessionRepository } from '$lib/services/storage/workout-session-repository';
	import { programRepository } from '$lib/services/storage/program-repository';
	import { programVersionRepository } from '$lib/services/storage/program-version-repository';
	import { featureFlags } from '$lib/utils/feature-flags';
	import type { WorkoutSession, SetLog } from '$lib/types/workout-session';
	import type { Program, Workout, Exercise } from '$lib/types/program';
	import Card from '$lib/components/shared/Card.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import Input from '$lib/components/shared/Input.svelte';
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
		const version = featureFlags.programVersioningReads && loadedSession.programVersionId
			? await programVersionRepository.getById(loadedSession.programVersionId)
			: null;
		const effectiveProgram = version
			? {
					id: loadedSession.programId,
					userId: loadedProgram?.userId,
					currentVersionId: version.id,
					createdAt: loadedProgram?.createdAt ?? version.createdAt,
					updatedAt: loadedProgram?.updatedAt ?? version.createdAt,
					...programVersionRepository.toProjection(version)
				}
			: loadedProgram;

		const loadedWorkout = effectiveProgram?.workouts.find((w) => w.id === loadedSession.workoutId);

		session = loadedSession;
		program = effectiveProgram || null;
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

</script>

<div class="space-y-6 animate-slideUp">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<button
			type="button"
			onclick={() => goto('/history')}
			class="p-2 rounded-xl hover:bg-border-soft transition-colors touch-target"
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
		<Card variant="success">
			<div class="space-y-4">
				<div class="flex items-start gap-4">
					<div
						class="flex-shrink-0 w-12 h-12 rounded-xl bg-[rgb(var(--color-success)/0.1)] flex items-center justify-center"
					>
						<CheckCircle size={24} class="text-[rgb(var(--color-success))]" />
					</div>
					<div class="flex-1 min-w-0">
						<h2 class="text-lg font-bold text-primary">{workout?.name || session.workoutNameSnapshot || 'Deleted workout'}</h2>
						<p class="text-sm text-secondary">{program?.name || 'Deleted program'}</p>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-2 border-t border-[rgb(var(--color-border))]">
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
							<h4 class="font-semibold text-primary">{exercise?.name || exerciseLog.exerciseName || 'Unknown exercise'}</h4>
							{#if exerciseLog.skipped}
								<span class="text-xs px-2 py-1 bg-warning-soft text-warning rounded-full">
									Skipped
								</span>
							{/if}
						</div>

							<!-- Sets -->
							<div class="space-y-2">
								{#each exerciseLog.sets as set, setIndex}
									{@const isEditing = editingSet?.exerciseIndex === exerciseIndex && editingSet?.setIndex === setIndex}
									<div
										class="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl {set.completed
											? 'bg-success-soft border border-success-soft'
											: 'bg-border-soft border border-theme'}"
									>
										{#if set.completed}
											<CheckCircle size={18} class="text-success flex-shrink-0" />
										{:else}
											<XCircle size={18} class="text-muted flex-shrink-0" />
										{/if}

										<span class="font-medium text-primary sm:w-14">Set {set.setNumber}</span>

										{#if isEditing}
											<!-- Edit mode -->
											<div class="flex-1 grid grid-cols-2 gap-2 min-w-0 w-full">
												<Input
													type="number"
													bind:value={editValues.reps}
													min="0"
													placeholder="Reps"
													containerClass="w-full sm:w-20"
													inputClass="px-3 py-2 text-center text-sm rounded-lg"
													inputMode="numeric"
												/>
												<Input
													type="number"
													bind:value={editValues.weight}
													min="0"
													step="0.5"
													placeholder="kg"
													containerClass="w-full sm:w-20"
													inputClass="px-3 py-2 text-center text-sm rounded-lg"
													inputMode="decimal"
												/>
											</div>
											<div class="flex items-center gap-1 self-end sm:self-auto">
												<button
													type="button"
													onclick={saveSetEdit}
													disabled={saving}
													class="p-2 rounded-lg bg-[rgb(var(--color-success))] hover:bg-[rgb(var(--color-success)/0.85)] text-black transition-colors disabled:opacity-50 touch-target"
													aria-label="Save"
												>
													<Save size={16} />
												</button>
												<button
													type="button"
													onclick={cancelEditing}
													class="p-2 rounded-lg bg-border-soft hover:bg-[rgb(var(--color-border)/0.55)] text-primary transition-colors touch-target"
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
													type="button"
													onclick={() => startEditing(exerciseIndex, setIndex, set)}
													class="p-2 rounded-lg hover:bg-border-soft text-muted hover:text-primary transition-colors touch-target"
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
