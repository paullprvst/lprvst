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
	import MuscleHeatmap from '$lib/components/visualization/MuscleHeatmap.svelte';
	import { formatDate, DAY_NAMES } from '$lib/utils/date-helpers';
	import { ArrowLeft, Calendar, Trash2, Sparkles, Save, X, Download } from 'lucide-svelte';
	import { exportProgramToPdf } from '$lib/utils/pdf-export';

	let program = $state<Program | null>(null);
	let loading = $state(true);
	let saving = $state(false);
	let lastPerformances = $state<Map<string, ExerciseLog>>(new Map());

	// Single workout edit modal
	let showEditModal = $state(false);
	let editingWorkoutIndex = $state<number | null>(null);
	let editableWorkout = $state<Workout | null>(null);

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

	async function deleteWorkout() {
		if (!program || editingWorkoutIndex === null) return;
		if (!confirm('Delete this workout?')) return;
		saving = true;
		try {
			const updatedWorkouts = program.workouts.filter((_, i) => i !== editingWorkoutIndex);
			await programRepository.update(program.id, { workouts: updatedWorkouts });
			program.workouts = updatedWorkouts;
			closeEditModal();
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!program) return;
		if (confirm('Are you sure you want to delete this program?')) {
			await programRepository.delete(program.id);
			goto('/');
		}
	}

	// Workouts sorted by day of week
	const sortedSchedule = $derived(
		program
			? [...program.schedule.weeklyPattern]
					.sort((a, b) => a.dayOfWeek - b.dayOfWeek)
					.map((pattern) => ({
						dayName: DAY_NAMES[pattern.dayOfWeek],
						workout: program.workouts[pattern.workoutIndex],
						workoutIndex: pattern.workoutIndex
					}))
					.filter((item) => item.workout)
			: []
	);
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
				onclick={handleDelete}
				class="text-red-600 hover:text-red-700 touch-target"
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
					ondelete={deleteWorkout}
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
{/if}
