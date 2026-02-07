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

			// Load last performances for all exercises in a single batch query
			if (program) {
				const exercises: Array<{ name: string; id: string }> = [];
				for (const workout of program.workouts) {
					for (const exercise of workout.exercises) {
						exercises.push({ name: exercise.name, id: exercise.id });
					}
				}
				lastPerformances = await workoutSessionRepository.getLastPerformancesForExercises(exercises);
			}
		}
		loading = false;
	});

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
				onclick={() => goto('/')}
				class="text-secondary hover:text-primary touch-target"
			>
				<ArrowLeft size={24} />
			</button>
			<h1 class="text-2xl font-bold text-primary flex-1">{program.name}</h1>
			<button
				onclick={requestProgramDelete}
				class="text-red-600 hover:text-red-700 touch-target"
				aria-label="Delete program"
			>
				<Trash2 size={20} />
			</button>
		</div>

		<Card>
			<div class="space-y-4">
				<div>
					<h2 class="text-sm font-medium text-muted uppercase">Description</h2>
					<p class="mt-1 text-primary">{program.description}</p>
				</div>

				<div>
					<h2 class="text-sm font-medium text-muted uppercase">Schedule</h2>
					<div class="mt-2 flex flex-wrap gap-2">
						{#each program.schedule.weeklyPattern as pattern}
							<span class="px-3 py-1 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-full text-sm font-medium">
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
					<div class="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2">
						<p class="text-sm text-amber-700 dark:text-amber-300">
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

		<div class="space-y-3">
			<Button onclick={togglePausedState} fullWidth={true} size="lg" variant="outline" disabled={togglingPause}>
				{#snippet children()}
					{#if program?.isPaused}
						<Play size={20} />
						{togglingPause ? 'Resuming...' : 'Resume Program'}
					{:else}
						<Pause size={20} />
						{togglingPause ? 'Pausing...' : 'Pause Program'}
					{/if}
				{/snippet}
			</Button>

			<Button onclick={() => goto('/calendar')} fullWidth={true} size="lg">
				{#snippet children()}
					<Calendar size={20} />
					View Calendar
				{/snippet}
			</Button>

			<Button onclick={() => goto(`/programs/${program!.id}/adapt`)} fullWidth={true} size="lg" variant="secondary">
				{#snippet children()}
					<Sparkles size={20} />
					Chat with AI
				{/snippet}
			</Button>

			<Button onclick={() => exportProgramToPdf(program!)} fullWidth={true} size="lg" variant="ghost">
				{#snippet children()}
					<Download size={20} />
					Export as PDF
				{/snippet}
			</Button>
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

				<div class="flex gap-3 pt-2 sticky bottom-0 bg-[rgb(var(--color-surface))] pb-2">
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
