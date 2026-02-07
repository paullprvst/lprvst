<svelte:head>
	<title>History | AI Fitness Coach</title>
</svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { workoutSessionRepository } from '$lib/services/storage/workout-session-repository';
	import { programRepository } from '$lib/services/storage/program-repository';
	import type { WorkoutSession } from '$lib/types/workout-session';
	import type { Program, Workout } from '$lib/types/program';
	import Card from '$lib/components/shared/Card.svelte';
	import Skeleton from '$lib/components/shared/Skeleton.svelte';
	import WorkoutCalendarDots from '$lib/components/history/WorkoutCalendarDots.svelte';
	import { formatDate } from '$lib/utils/date-helpers';
	import { CheckCircle, Clock, History, Dumbbell, ChevronRight } from 'lucide-svelte';

	interface SessionWithDetails {
		session: WorkoutSession;
		workout: Workout | null;
		program: Program | null;
	}

	let sessions = $state<SessionWithDetails[]>([]);
	let allSessions = $state<WorkoutSession[]>([]);
	let loading = $state(true);

	onMount(async () => {
		const completedSessions = await workoutSessionRepository.getCompleted();
		const programs = await programRepository.getAll();

		allSessions = completedSessions;
		sessions = completedSessions.map((session) => {
			const program = programs.find((p) => p.id === session.programId) || null;
			const workout = program?.workouts.find((w) => w.id === session.workoutId) || null;
			return { session, workout, program };
		});

		loading = false;
	});

	function formatDuration(session: WorkoutSession): string {
		if (!session.completedAt) return 'N/A';
		const duration = Math.floor(
			(session.completedAt.getTime() - session.startedAt.getTime()) / 1000 / 60
		);
		return `${duration} min`;
	}

	function getTotalSets(session: WorkoutSession): number {
		return session.exercises.reduce((total, ex) => total + ex.sets.length, 0);
	}

	function getCompletedSets(session: WorkoutSession): number {
		return session.exercises.reduce(
			(total, ex) => total + ex.sets.filter((s) => s.completed).length,
			0
		);
	}
</script>

<div class="space-y-6 animate-slideUp">
	<div class="flex items-center gap-3">
		<div
			class="w-10 h-10 rounded-xl bg-[rgb(var(--color-primary)/0.1)] flex items-center justify-center"
		>
			<History size={20} class="text-[rgb(var(--color-primary))]" />
		</div>
		<h1 class="text-2xl font-bold text-primary">Workout History</h1>
	</div>

	<!-- 3-Month Calendar Dots -->
	{#if !loading && allSessions.length > 0}
		<Card padding="md">
			<WorkoutCalendarDots sessions={allSessions} />
		</Card>
	{/if}

	{#if loading}
		<div class="space-y-3">
			<Skeleton variant="card" height="80px" />
			{#each [1, 2, 3] as i}
				<Card>
					<div class="flex items-center gap-4">
						<Skeleton variant="circular" width="48px" height="48px" />
						<div class="flex-1 space-y-2">
							<Skeleton variant="text" width="60%" />
							<Skeleton variant="text" width="40%" />
						</div>
					</div>
				</Card>
			{/each}
		</div>
	{:else if sessions.length === 0}
		<Card padding="lg">
			<div class="text-center py-8 space-y-4">
				<div
					class="w-20 h-20 mx-auto rounded-2xl bg-[rgb(var(--color-border)/0.5)] flex items-center justify-center"
				>
					<Dumbbell size={40} class="text-muted" />
				</div>
				<div class="space-y-2">
					<h3 class="text-lg font-semibold text-primary">No completed workouts yet</h3>
					<p class="text-secondary text-sm max-w-xs mx-auto">
						Start your first workout from the calendar to see your history here.
					</p>
				</div>
			</div>
		</Card>
	{:else}
		<div class="space-y-3">
			{#each sessions as { session, workout, program }, index}
				<button
					class="w-full text-left animate-slideUp group"
					style="animation-delay: {index * 50}ms"
					onclick={() => goto(`/history/${session.id}`)}
				>
					<Card>
						<div class="flex items-center gap-4">
							<!-- Success Icon -->
							<div
								class="flex-shrink-0 w-12 h-12 rounded-xl bg-[rgb(var(--color-success)/0.1)] flex items-center justify-center"
							>
								<CheckCircle size={24} class="text-[rgb(var(--color-success))]" />
							</div>

							<!-- Content -->
							<div class="flex-1 min-w-0">
								<h3 class="font-semibold text-primary truncate">{workout?.name || session.workoutNameSnapshot || 'Deleted workout'}</h3>
								<p class="text-sm text-secondary">{program?.name || 'Deleted program'}</p>

								<!-- Meta info -->
								<div class="flex items-center gap-3 mt-2 text-xs text-muted">
									<div class="flex items-center gap-1">
										<Clock size={12} />
										<span>{formatDuration(session)}</span>
									</div>
									<span class="text-[rgb(var(--color-border))]">|</span>
									<span>{getCompletedSets(session)}/{getTotalSets(session)} sets</span>
								</div>
							</div>

							<!-- Date and chevron -->
							<div class="flex items-center gap-2 flex-shrink-0">
								<div class="text-xs text-muted text-right">
									{formatDate(session.completedAt || session.startedAt, 'MMM d')}
									<br />
									{formatDate(session.completedAt || session.startedAt, 'h:mm a')}
								</div>
								<ChevronRight size={20} class="text-muted" />
							</div>
						</div>
					</Card>
				</button>
			{/each}
		</div>
	{/if}
</div>
