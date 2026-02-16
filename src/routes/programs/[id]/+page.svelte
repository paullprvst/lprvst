<svelte:head>
	<title>{program?.name ?? 'Program'} | AI Fitness Coach</title>
</svelte:head>

<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { programRepository } from '$lib/services/storage/program-repository';
	import { workoutSessionRepository } from '$lib/services/storage/workout-session-repository';
	import type { Program, Workout } from '$lib/types/program';
	import type { ExerciseLog } from '$lib/types/workout-session';
	import WorkoutCard from '$lib/components/program/WorkoutCard.svelte';
	import WorkoutEditor from '$lib/components/program/WorkoutEditor.svelte';
	import Modal from '$lib/components/shared/Modal.svelte';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';
	import Card from '$lib/components/shared/Card.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte';
	import MuscleHeatmap from '$lib/components/visualization/MuscleHeatmap.svelte';
	import { formatDate, DAY_NAMES } from '$lib/utils/date-helpers';
	import { ArrowLeft, Calendar, Trash2, Sparkles, Save, X, Download, Pause, Play } from 'lucide-svelte';
	import { exportProgramToPdf } from '$lib/utils/pdf-export';

	let program = $state<Program | null>(null);
	let loading = $state(true);
	let saving = $state(false);
	let togglingPause = $state(false);
	let lastPerformances = $state<Map<string, ExerciseLog>>(new Map());

	// Single workout edit modal
	let showEditModal = $state(false);
	let editingWorkoutIndex = $state<number | null>(null);
	let editableWorkout = $state<Workout | null>(null);
	let showDeleteWorkoutConfirm = $state(false);
	let showDeleteProgramConfirm = $state(false);

	onMount(async () => {
		const id = $page.params.id;
		if (id) {
			const loaded = await programRepository.get(id);
			program = loaded || null;
		}
		loading = false;
		if (program) {
			void loadLastPerformances(program);
		}
	});

	async function loadLastPerformances(currentProgram: Program) {
		try {
			const exerciseIds: string[] = [];
			for (const workout of currentProgram.workouts) {
				for (const exercise of workout.exercises) {
					exerciseIds.push(exercise.id);
				}
			}
			lastPerformances = await workoutSessionRepository.getLastPerformancesForExerciseIds(exerciseIds);
		} catch (error) {
			console.warn('Failed to load last performances:', error);
		}
	}

	function openEditModal(index: number) {
		if (!program) return;
		editingWorkoutIndex = index;
		editableWorkout = JSON.parse(JSON.stringify(program.workouts[index]));
		showEditModal = true;
	}

	function closeEditModal() {
		showEditModal = false;
		editingWorkoutIndex = null;
		editableWorkout = null;
	}

	async function saveWorkout() {
		if (!program || editingWorkoutIndex === null || !editableWorkout) return;
		saving = true;
		try {
			const updatedWorkouts = [...program.workouts];
			updatedWorkouts[editingWorkoutIndex] = editableWorkout;
			await programRepository.update(program.id, { workouts: updatedWorkouts });
			program.workouts = updatedWorkouts;
			closeEditModal();
		} finally {
			saving = false;
		}
	}

	function requestDeleteWorkout() {
		showDeleteWorkoutConfirm = true;
	}

	async function deleteWorkout() {
		if (!program || editingWorkoutIndex === null) return;
		const workoutIndexToDelete = editingWorkoutIndex;
		saving = true;
		try {
			const updatedWorkouts = program.workouts.filter((_, i) => i !== workoutIndexToDelete);
			const updatedSchedule = {
				...program.schedule,
				weeklyPattern: program.schedule.weeklyPattern
					.filter((pattern) => pattern.workoutIndex !== workoutIndexToDelete)
					.map((pattern) => ({
						...pattern,
						workoutIndex:
							pattern.workoutIndex > workoutIndexToDelete
								? pattern.workoutIndex - 1
								: pattern.workoutIndex
					}))
			};

			await programRepository.update(program.id, {
				workouts: updatedWorkouts,
				schedule: updatedSchedule
			});
			program.workouts = updatedWorkouts;
			program.schedule = updatedSchedule;
			closeEditModal();
			showDeleteWorkoutConfirm = false;
		} finally {
			saving = false;
		}
	}

	function requestProgramDelete() {
		showDeleteProgramConfirm = true;
	}

	async function handleDelete() {
		if (!program) return;
		await programRepository.delete(program.id);
		showDeleteProgramConfirm = false;
		goto('/');
	}

	async function togglePausedState() {
		if (!program) return;
		togglingPause = true;
		try {
			const nextPausedState = !program.isPaused;
			await programRepository.update(program.id, { isPaused: nextPausedState });
			program.isPaused = nextPausedState;
		} finally {
			togglingPause = false;
		}
	}

	// Workouts sorted by day of week
	const sortedSchedule = $derived.by(() => {
		const currentProgram = program;
		if (!currentProgram) return [];

		return [...currentProgram.schedule.weeklyPattern]
			.sort((a, b) => a.dayOfWeek - b.dayOfWeek)
			.map((pattern) => ({
				dayName: DAY_NAMES[pattern.dayOfWeek],
				workout: currentProgram.workouts[pattern.workoutIndex],
				workoutIndex: pattern.workoutIndex
			}))
			.filter((item) => item.workout);
	});
</script>

{#if loading}
	<div class="flex justify-center py-12">
		<LoadingSpinner size="lg" />
	</div>
{:else if !program}
	<Card>
		<div class="text-center py-12">
			<p class="text-secondary">Program not found</p>
			<Button onclick={() => goto('/')}>
				{#snippet children()}
					Go Home
				{/snippet}
			</Button>
		</div>
	</Card>
{:else}
	<div class="space-y-6">
		<div class="flex items-center gap-4">
			<button
				type="button"
				onclick={() => goto('/programs')}
				class="text-secondary hover:text-primary touch-target"
				aria-label="Back to programs"
			>
				<ArrowLeft size={24} />
			</button>
			<h1 class="text-2xl font-bold text-primary flex-1 min-w-0 truncate">{program.name}</h1>
			<button
				type="button"
				onclick={requestProgramDelete}
				class="text-error hover:opacity-90 touch-target"
				aria-label="Delete program"
			>
				<Trash2 size={20} />
			</button>
		</div>

		<Card padding="md">
			<div class="space-y-3">
				<p class="text-[11px] font-semibold tracking-[0.08em] uppercase text-muted">Quick Actions</p>
				<div class="grid grid-cols-2 gap-2.5">
					<Button onclick={() => goto('/calendar')} fullWidth={true} size="md">
						{#snippet children()}
							<Calendar size={18} class="hidden sm:block" />
							View Calendar
						{/snippet}
					</Button>

					<Button onclick={() => goto(`/programs/${program!.id}/adapt`)} fullWidth={true} size="md" variant="secondary">
						{#snippet children()}
							<Sparkles size={18} class="hidden sm:block" />
							Chat with AI
						{/snippet}
					</Button>

					<Button onclick={togglePausedState} fullWidth={true} size="md" variant="outline" disabled={togglingPause}>
						{#snippet children()}
							{#if program?.isPaused}
								<Play size={18} class="hidden sm:block" />
								{togglingPause ? 'Resuming...' : 'Resume'}
							{:else}
								<Pause size={18} class="hidden sm:block" />
								{togglingPause ? 'Pausing...' : 'Pause'}
							{/if}
						{/snippet}
					</Button>

					<Button onclick={() => exportProgramToPdf(program!)} fullWidth={true} size="md" variant="ghost">
						{#snippet children()}
							<Download size={18} class="hidden sm:block" />
							Export PDF
						{/snippet}
					</Button>
				</div>
			</div>
		</Card>

		<Card variant="info">
			<div class="space-y-4">
				<div>
					<h2 class="text-sm font-medium text-muted uppercase">Description</h2>
					<p class="mt-1 text-primary">{program.description}</p>
				</div>

				<div>
					<h2 class="text-sm font-medium text-muted uppercase">Schedule</h2>
					<div class="mt-2 flex flex-wrap gap-2">
						{#each program.schedule.weeklyPattern as pattern}
							<span class="px-3 py-1 bg-brand-soft text-brand rounded-full text-sm font-medium">
								{DAY_NAMES[pattern.dayOfWeek]}
							</span>
						{/each}
					</div>
				</div>

				<div>
					<h2 class="text-sm font-medium text-muted uppercase">Started</h2>
					<p class="mt-1 text-primary">{formatDate(program.startDate)}</p>
				</div>

				{#if program?.isPaused}
					<div class="rounded-xl bg-warning-soft border border-warning-soft px-3 py-2">
						<p class="text-sm text-warning">
							This program is paused and hidden from the calendar.
						</p>
					</div>
				{/if}
			</div>
		</Card>

		<div>
			<h2 class="text-xl font-semibold text-primary mb-3">Weekly Schedule</h2>
			<div class="space-y-3">
				{#each sortedSchedule as { dayName, workout, workoutIndex }}
					<div>
						<p class="text-sm font-medium text-muted mb-1.5">{dayName}</p>
						<WorkoutCard {workout} onedit={() => openEditModal(workoutIndex)} {lastPerformances} />
					</div>
				{/each}
			</div>
		</div>

		<MuscleHeatmap {program} />
	</div>

		<!-- Edit workout modal -->
	<Modal bind:open={showEditModal} title="Edit Workout" size="lg">
		{#if editableWorkout}
			<div class="space-y-4">
				<WorkoutEditor
					bind:workout={editableWorkout}
					ondelete={requestDeleteWorkout}
				/>

				<div class="flex gap-3 pt-3 sticky bottom-0 surface-elevated border-t border-theme pb-2">
					<Button onclick={closeEditModal} variant="ghost" fullWidth={true}>
						{#snippet children()}
							<X size={18} />
							Cancel
						{/snippet}
					</Button>
					<Button onclick={saveWorkout} fullWidth={true} disabled={saving}>
						{#snippet children()}
							<Save size={18} />
							{saving ? 'Saving...' : 'Save'}
						{/snippet}
					</Button>
				</div>
			</div>
		{/if}
	</Modal>

	<ConfirmDialog
		bind:open={showDeleteWorkoutConfirm}
		title="Delete Workout?"
		message="This removes the workout and its schedule slots from this program."
		confirmLabel="Delete Workout"
		cancelLabel="Keep Workout"
		danger={true}
		loading={saving}
		onconfirm={deleteWorkout}
	/>

	<ConfirmDialog
		bind:open={showDeleteProgramConfirm}
		title="Delete Program?"
		message="This permanently deletes the entire program and cannot be undone."
		confirmLabel="Delete Program"
		cancelLabel="Cancel"
		danger={true}
		onconfirm={handleDelete}
	/>
{/if}
