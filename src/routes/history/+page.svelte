<script lang="ts">
	import { onMount } from 'svelte';
	import { workoutSessionRepository } from '$lib/services/storage/workout-session-repository';
	import { programRepository } from '$lib/services/storage/program-repository';
	import type { WorkoutSession } from '$lib/types/workout-session';
	import type { Program, Workout } from '$lib/types/program';
	import Card from '$lib/components/shared/Card.svelte';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';
	import { formatDate } from '$lib/utils/date-helpers';
	import { formatWorkoutDuration } from '$lib/utils/formatters';
	import { CheckCircle, Clock } from 'lucide-svelte';

	interface SessionWithDetails {
		session: WorkoutSession;
		workout: Workout;
		program: Program;
	}

	let sessions = $state<SessionWithDetails[]>([]);
	let loading = $state(true);

	onMount(async () => {
		const completedSessions = await workoutSessionRepository.getCompleted();
		const programs = await programRepository.getAll();

		sessions = completedSessions
			.map(session => {
				const program = programs.find(p => p.id === session.programId);
				if (!program) return null;

				const workout = program.workouts.find(w => w.id === session.workoutId);
				if (!workout) return null;

				return { session, workout, program };
			})
			.filter((s): s is SessionWithDetails => s !== null);

		loading = false;
	});

	function formatDuration(session: WorkoutSession): string {
		if (!session.completedAt) return 'N/A';
		const duration = Math.floor((session.completedAt.getTime() - session.startedAt.getTime()) / 1000 / 60);
		return `${duration} min`;
	}

	function getTotalSets(session: WorkoutSession): number {
		return session.exercises.reduce((total, ex) => total + ex.sets.length, 0);
	}

	function getCompletedSets(session: WorkoutSession): number {
		return session.exercises.reduce(
			(total, ex) => total + ex.sets.filter(s => s.completed).length,
			0
		);
	}
</script>

<div class="space-y-4">
	<h1 class="text-2xl font-bold">Workout History</h1>

	{#if loading}
		<div class="flex justify-center py-12">
			<LoadingSpinner size="lg" />
		</div>
	{:else if sessions.length === 0}
		<Card>
			<div class="text-center py-12">
				<p class="text-gray-600">No completed workouts yet. Start your first workout!</p>
			</div>
		</Card>
	{:else}
		<div class="space-y-3">
			{#each sessions as { session, workout, program }}
				<Card>
					<div class="space-y-3">
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<h3 class="font-semibold text-gray-900">{workout.name}</h3>
								<p class="text-sm text-gray-600">{program.name}</p>
							</div>
							<CheckCircle size={20} class="text-green-600 flex-shrink-0 ml-2" />
						</div>

						<div class="flex items-center gap-4 text-sm text-gray-500">
							<div class="flex items-center gap-1">
								<Clock size={16} />
								<span>{formatDuration(session)}</span>
							</div>
							<span>•</span>
							<span>{getCompletedSets(session)}/{getTotalSets(session)} sets</span>
						</div>

						<div class="text-xs text-gray-400">
							{formatDate(session.completedAt || session.startedAt, 'MMM d, yyyy • h:mm a')}
						</div>
					</div>
				</Card>
			{/each}
		</div>
	{/if}
</div>
