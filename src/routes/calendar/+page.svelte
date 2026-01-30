<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { programRepository } from '$lib/services/storage/program-repository';
	import { workoutSessionRepository } from '$lib/services/storage/workout-session-repository';
	import type { Program } from '$lib/types/program';
	import type { WorkoutSession } from '$lib/types/workout-session';
	import WeekView from '$lib/components/calendar/WeekView.svelte';
	import Skeleton from '$lib/components/shared/Skeleton.svelte';
	import Card from '$lib/components/shared/Card.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import { Calendar, Plus, ChevronDown, Play, X } from 'lucide-svelte';
	import { formatDuration } from '$lib/utils/date-helpers';

	let programs = $state<Program[]>([]);
	let selectedProgram = $state<Program | null>(null);
	let completedSessions = $state<WorkoutSession[]>([]);
	let inProgressSession = $state<WorkoutSession | null>(null);
	let inProgressWorkoutName = $state<string | null>(null);
	let loading = $state(true);

	onMount(async () => {
		programs = await programRepository.getAll();
		if (programs.length > 0) {
			selectedProgram = programs[0];
		}
		// Load all completed sessions
		completedSessions = await workoutSessionRepository.getCompleted();
		// Check for in-progress sessions
		const inProgressSessions = await workoutSessionRepository.getInProgress();
		if (inProgressSessions.length > 0) {
			inProgressSession = inProgressSessions[0];
			// Find the workout name
			const program = programs.find(p => p.id === inProgressSession!.programId);
			const workout = program?.workouts.find(w => w.id === inProgressSession!.workoutId);
			inProgressWorkoutName = workout?.name || 'Workout';
		}
		loading = false;
	});

	function resumeWorkout() {
		if (inProgressSession) {
			goto(`/workout/${inProgressSession.id}`);
		}
	}

	async function discardInProgressSession() {
		if (!inProgressSession) return;
		if (!confirm('Are you sure you want to discard this in-progress workout?')) return;
		await workoutSessionRepository.update(inProgressSession.id, { status: 'abandoned' });
		inProgressSession = null;
		inProgressWorkoutName = null;
	}

	async function startWorkout(workoutId: string, workoutIndex: number, date: Date) {
		if (!selectedProgram) return;

		const session = await workoutSessionRepository.create({
			workoutId,
			programId: selectedProgram.id,
			status: 'in-progress',
			exercises: selectedProgram.workouts[workoutIndex].exercises.map((e) => ({
				exerciseId: e.id,
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
{:else if programs.length === 0}
	<Card padding="lg">
		<div class="text-center py-8 space-y-4">
			<div
				class="w-20 h-20 mx-auto rounded-2xl bg-[rgb(var(--color-border)/0.5)] flex items-center justify-center"
			>
				<Calendar size={40} class="text-muted" />
			</div>
			<div class="space-y-2">
				<h3 class="text-lg font-semibold text-primary">No programs yet</h3>
				<p class="text-secondary text-sm max-w-xs mx-auto">
					Create a program to see your workout calendar and schedule.
				</p>
			</div>
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
			<Card padding="md">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
						<Play size={20} class="text-amber-500" />
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
							onclick={discardInProgressSession}
							class="p-2 rounded-lg text-muted hover:text-primary hover:bg-gray-500/10 transition-colors"
							aria-label="Discard workout"
						>
							<X size={18} />
						</button>
					</div>
				</div>
			</Card>
		{/if}

		<!-- Program selector (if multiple programs) -->
		{#if programs.length > 1}
			<div class="relative">
				<label class="block text-sm font-medium text-secondary mb-2">Select Program</label>
				<div class="relative">
					<select
						bind:value={selectedProgram}
						class="w-full px-4 py-3 pr-10 surface border border-theme rounded-xl text-primary appearance-none cursor-pointer input-focus-ring"
					>
						{#each programs as program}
							<option value={program}>{program.name}</option>
						{/each}
					</select>
					<ChevronDown
						size={20}
						class="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
					/>
				</div>
			</div>
		{/if}

		<WeekView program={selectedProgram} {completedSessions} onworkoutclick={startWorkout} />
	</div>
{/if}
