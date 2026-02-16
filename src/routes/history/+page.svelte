<svelte:head>
	<title>History | AI Fitness Coach</title>
</svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { workoutSessionRepository } from '$lib/services/storage/workout-session-repository';
	import { programRepository } from '$lib/services/storage/program-repository';
	import { programVersionRepository } from '$lib/services/storage/program-version-repository';
	import { getTabCache, setTabCache } from '$lib/services/tab-cache';
	import { TAB_CACHE_KEYS } from '$lib/services/tab-cache-keys';
	import { featureFlags } from '$lib/utils/feature-flags';
	import type { WorkoutSession } from '$lib/types/workout-session';
	import type { Program, Workout } from '$lib/types/program';
	import Card from '$lib/components/shared/Card.svelte';
	import Skeleton from '$lib/components/shared/Skeleton.svelte';
	import WorkoutCalendarDots from '$lib/components/history/WorkoutCalendarDots.svelte';
	import { formatDate } from '$lib/utils/date-helpers';
	import { CheckCircle, Clock, History, Dumbbell } from 'lucide-svelte';

	interface SessionWithDetails {
		session: WorkoutSession;
		workout: Workout | null;
		program: Program | null;
	}

	const CACHE_TTL_MS = 30_000;

	interface HistoryTabCache {
		sessions: SessionWithDetails[];
		allSessions: WorkoutSession[];
	}

	const cached = getTabCache<HistoryTabCache>(TAB_CACHE_KEYS.history, CACHE_TTL_MS);

	let sessions = $state<SessionWithDetails[]>(cached?.sessions ?? []);
	let allSessions = $state<WorkoutSession[]>(cached?.allSessions ?? []);
	let loading = $state(!cached);

	async function loadHistoryData() {
		const [completedSessions, programs] = await Promise.all([
			workoutSessionRepository.getCompleted(),
			programRepository.getAll()
		]);
		let versionsById = new Map<
			string,
			NonNullable<Awaited<ReturnType<typeof programVersionRepository.getById>>>
		>();
		if (featureFlags.programVersioningReads) {
			const versionIds = [
				...new Set(completedSessions.map((session) => session.programVersionId).filter(Boolean))
			] as string[];
			versionsById = await programVersionRepository.getByIds(versionIds);
		}

		allSessions = completedSessions;
		sessions = completedSessions.map((session) => {
			const program = programs.find((p) => p.id === session.programId) || null;
			const version = featureFlags.programVersioningReads && session.programVersionId
				? versionsById.get(session.programVersionId) || null
				: null;
			const effectiveProgram: Program | null = version && session.programId
				? {
						id: session.programId,
						userId: program?.userId,
						currentVersionId: version.id,
						createdAt: program?.createdAt ?? version.createdAt,
						updatedAt: program?.updatedAt ?? version.createdAt,
						...programVersionRepository.toProjection(version)
					}
				: program;
			const workout = effectiveProgram?.workouts.find((w) => w.id === session.workoutId) || null;
			return { session, workout, program: effectiveProgram };
		});

		setTabCache<HistoryTabCache>(TAB_CACHE_KEYS.history, {
			sessions,
			allSessions
		});
	}

	onMount(async () => {
		if (cached) {
			loading = false;
			try {
				await loadHistoryData();
			} catch (err) {
				console.warn('Failed to refresh history data:', err);
			}
			return;
		}

		await loadHistoryData();
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

	<!-- 3-Month Calendar Dots -->
	{#if !loading && allSessions.length > 0}
		<Card padding="md" variant="info">
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
		<Card padding="lg" variant="info">
			<div class="text-center py-8 space-y-4">
				<div
					class="w-20 h-20 mx-auto rounded-2xl bg-border-soft flex items-center justify-center"
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
				<div class="animate-slideUp" style="animation-delay: {index * 50}ms">
					<Card variant="interactive" onclick={() => goto(`/history/${session.id}`)}>
						<div class="flex items-start sm:items-center gap-3 sm:gap-4">
							<!-- Success Icon -->
							<div
								class="hidden sm:flex flex-shrink-0 w-12 h-12 rounded-xl bg-[rgb(var(--color-success)/0.1)] items-center justify-center"
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
										<Clock size={12} class="hidden sm:block" />
										<span>{formatDuration(session)}</span>
									</div>
									<span class="text-[rgb(var(--color-border))]">|</span>
									<span>{getCompletedSets(session)}/{getTotalSets(session)} sets</span>
								</div>

								<p class="text-xs text-muted mt-1 sm:hidden">
									{formatDate(session.completedAt || session.startedAt, 'MMM d, h:mm a')}
								</p>
							</div>

								<!-- Date -->
								<div class="hidden sm:flex items-center gap-2 flex-shrink-0">
									<div class="text-xs text-muted text-right">
										{formatDate(session.completedAt || session.startedAt, 'MMM d')}
										<br />
										{formatDate(session.completedAt || session.startedAt, 'h:mm a')}
									</div>
								</div>
						</div>
					</Card>
				</div>
			{/each}
		</div>
	{/if}
</div>
