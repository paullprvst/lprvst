<svelte:head>
	<title>Calendar | AI Fitness Coach</title>
</svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { programRepository } from '$lib/services/storage/program-repository';
	import { workoutSessionRepository } from '$lib/services/storage/workout-session-repository';
	import { getTabCache, setTabCache } from '$lib/services/tab-cache';
	import { TAB_CACHE_KEYS } from '$lib/services/tab-cache-keys';
	import type { Program } from '$lib/types/program';
	import type { WorkoutSession } from '$lib/types/workout-session';
	import WeekView from '$lib/components/calendar/WeekView.svelte';
	import Skeleton from '$lib/components/shared/Skeleton.svelte';
	import Card from '$lib/components/shared/Card.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import Select from '$lib/components/shared/Select.svelte';
	import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte';
	import { Calendar, Plus, Play, X } from 'lucide-svelte';
	import { formatDuration } from '$lib/utils/date-helpers';
	import { featureFlags } from '$lib/utils/feature-flags';

	const CACHE_TTL_MS = 30_000;

	interface CalendarTabCache {
		programs: Program[];
		activePrograms: Program[];
		selectedProgramId: string;
		completedSessions: WorkoutSession[];
		inProgressSession: WorkoutSession | null;
		inProgressWorkoutName: string | null;
	}

	const cached = getTabCache<CalendarTabCache>(TAB_CACHE_KEYS.calendar, CACHE_TTL_MS);

	let programs = $state<Program[]>(cached?.programs ?? []);
	let activePrograms = $state<Program[]>(cached?.activePrograms ?? []);
	let selectedProgramId = $state<string>(cached?.selectedProgramId ?? '');
	let completedSessions = $state<WorkoutSession[]>(cached?.completedSessions ?? []);
	let inProgressSession = $state<WorkoutSession | null>(cached?.inProgressSession ?? null);
	let inProgressWorkoutName = $state<string | null>(cached?.inProgressWorkoutName ?? null);
	let showDiscardConfirm = $state(false);
	let loading = $state(!cached);
	const selectedProgram = $derived(activePrograms.find((program) => program.id === selectedProgramId) ?? null);

	onMount(async () => {
		if (!cached) {
			await loadCalendarData();
		}
	});

	$effect(() => {
		if (activePrograms.length === 0) {
			selectedProgramId = '';
			return;
		}

		const isStillValid = activePrograms.some((program) => program.id === selectedProgramId);
		if (!isStillValid) {
			selectedProgramId = activePrograms[0].id;
		}

		if (!loading) {
			updateCalendarCache();
		}
	});

	function resumeWorkout() {
		if (inProgressSession) {
			goto(`/workout/${inProgressSession.id}`);
		}
	}

	async function discardInProgressSession() {
		if (!inProgressSession) return;
		await workoutSessionRepository.update(inProgressSession.id, { status: 'abandoned' });
		inProgressSession = null;
		inProgressWorkoutName = null;
		showDiscardConfirm = false;
		updateCalendarCache();
	}

	async function startWorkout(workoutId: string, workoutIndex: number, date: Date) {
		if (!selectedProgram) return;

		const session = await workoutSessionRepository.create({
			workoutId,
			workoutNameSnapshot: selectedProgram.workouts[workoutIndex].name,
			programId: selectedProgram.id,
			programVersionId: featureFlags.programVersioningWrites
				? selectedProgram.currentVersionId
				: undefined,
			status: 'in-progress',
			exercises: selectedProgram.workouts[workoutIndex].exercises.map((e) => ({
				exerciseId: e.id,
				exerciseName: e.name,
				sets: Array(e.sets)
					.fill(null)
					.map((_, i) => ({
						setNumber: i + 1,
						completed: false
					}))
			}))
		});

		goto(`/workout/${session.id}`);
	}

	async function loadCalendarData() {
		loading = true;
		try {
			programs = await programRepository.getAll();
			activePrograms = programs.filter((program) => !program.isPaused);
			if (activePrograms.length > 0 && !selectedProgramId) {
				selectedProgramId = activePrograms[0].id;
			}

			completedSessions = await workoutSessionRepository.getCompleted();
			const inProgressSessions = await workoutSessionRepository.getInProgress();

			if (inProgressSessions.length > 0) {
				inProgressSession = inProgressSessions[0];
				const program = programs.find((p) => p.id === inProgressSession!.programId);
				const workout = program?.workouts.find((w) => w.id === inProgressSession!.workoutId);
				inProgressWorkoutName = workout?.name || inProgressSession.workoutNameSnapshot || 'Workout';
			} else {
				inProgressSession = null;
				inProgressWorkoutName = null;
			}

			updateCalendarCache();
		} finally {
			loading = false;
		}
	}

	function updateCalendarCache() {
		setTabCache<CalendarTabCache>(TAB_CACHE_KEYS.calendar, {
			programs,
			activePrograms,
			selectedProgramId,
			completedSessions,
			inProgressSession,
			inProgressWorkoutName
		});
	}
</script>

{#if loading}
	<div class="space-y-6">
		<Card>
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<Skeleton variant="button" width="40px" height="40px" />
					<Skeleton variant="text" width="200px" height="24px" />
					<Skeleton variant="button" width="40px" height="40px" />
				</div>
				<div class="grid grid-cols-7 gap-2">
					{#each Array(7) as _}
						<Skeleton variant="circular" width="100%" height="60px" className="rounded-xl" />
					{/each}
				</div>
			</div>
		</Card>
		<div class="space-y-3">
			<Skeleton variant="text" width="180px" height="24px" />
			{#each [1, 2] as _}
				<Card>
					<div class="space-y-2">
						<Skeleton variant="text" width="60%" />
						<Skeleton variant="text" width="40%" />
					</div>
				</Card>
			{/each}
		</div>
	</div>
{:else if activePrograms.length === 0}
	<Card padding="lg" variant="info">
		<div class="text-center py-8 space-y-4">
			<div
				class="w-20 h-20 mx-auto rounded-2xl bg-border-soft flex items-center justify-center"
			>
				<Calendar size={40} class="text-muted" />
			</div>
			<div class="space-y-2">
				{#if programs.length === 0}
					<h3 class="text-lg font-semibold text-primary">No programs yet</h3>
					<p class="text-secondary text-sm max-w-xs mx-auto">
						Create a program to see your workout calendar and schedule.
					</p>
				{:else}
					<h3 class="text-lg font-semibold text-primary">All programs are paused</h3>
					<p class="text-secondary text-sm max-w-xs mx-auto">
						Resume a program to show it in your calendar, or create a new one.
					</p>
				{/if}
			</div>
			{#if programs.length > 0}
				<Button onclick={() => goto('/programs')} variant="secondary">
					{#snippet children()}
						Manage Programs
					{/snippet}
				</Button>
			{/if}
			<Button onclick={() => goto('/onboarding')}>
				{#snippet children()}
					<Plus size={20} />
					Create Program
				{/snippet}
			</Button>
		</div>
	</Card>
{:else if selectedProgram}
	<div class="space-y-4 animate-slideUp">
		<!-- In-progress session banner -->
		{#if inProgressSession}
			<Card padding="md" variant="warning">
				<div class="flex items-center gap-3 flex-wrap sm:flex-nowrap">
					<div class="hidden sm:flex w-10 h-10 rounded-full bg-warning-soft items-center justify-center flex-shrink-0">
						<Play size={20} class="text-warning" />
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium text-primary truncate">{inProgressWorkoutName}</p>
						<p class="text-xs text-secondary">
							Started {formatDuration(Math.floor((Date.now() - inProgressSession.startedAt.getTime()) / 1000))} ago
						</p>
					</div>
					<div class="flex items-center gap-2">
						<Button onclick={resumeWorkout} size="sm">
							{#snippet children()}
								Resume
							{/snippet}
						</Button>
						<button
							onclick={() => (showDiscardConfirm = true)}
							type="button"
							class="p-2 rounded-lg text-muted hover:text-primary hover:bg-border-soft transition-colors touch-target"
							aria-label="Discard workout"
						>
							<X size={18} />
						</button>
					</div>
				</div>
			</Card>
		{/if}

		<!-- Program selector (if multiple programs) -->
		{#if activePrograms.length > 1}
			<div class="relative">
				<label for="active-program-select" class="block text-sm font-medium text-secondary mb-2">Select Program</label>
				<Select
					id="active-program-select"
					bind:value={selectedProgramId}
					options={activePrograms.map((program) => ({ value: program.id, label: program.name }))}
					ariaLabel="Select active program"
				/>
			</div>
		{/if}

		<WeekView program={selectedProgram} {completedSessions} onworkoutclick={startWorkout} />
	</div>
{/if}

<ConfirmDialog
	bind:open={showDiscardConfirm}
	title="Discard In-Progress Workout?"
	message="This will abandon the current session and remove it from your in-progress list."
	confirmLabel="Discard Workout"
	cancelLabel="Keep Session"
	danger={true}
	onconfirm={discardInProgressSession}
/>
