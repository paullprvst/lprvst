<svelte:head>
	<title>Exercise History | AI Fitness Coach</title>
</svelte:head>

<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { workoutSessionRepository } from '$lib/services/storage/workout-session-repository';
	import { programRepository } from '$lib/services/storage/program-repository';
	import type { ExerciseHistoryEntry, SetLog } from '$lib/types/workout-session';
	import Card from '$lib/components/shared/Card.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';
	import { formatDate } from '$lib/utils/date-helpers';
	import { ArrowLeft, Clock, MessageSquare, CheckCircle, History } from 'lucide-svelte';

	let loading = $state(true);
	let loadError = $state('');
	let entries = $state<ExerciseHistoryEntry[]>([]);
	let exerciseName = $state('Exercise');
	let programNamesById = $state<Map<string, string>>(new Map());

	onMount(async () => {
		const exerciseId = $page.params.id;
		if (!exerciseId) {
			goto('/history');
			return;
		}

		try {
			loadError = '';
			const [historyEntries, programs] = await Promise.all([
				workoutSessionRepository.getExerciseHistoryById(exerciseId),
				programRepository.getAll()
			]);

			entries = historyEntries;
			if (entries.length > 0) {
				exerciseName = entries[0].exerciseName || exerciseName;
			}

			const nextProgramNamesById = new Map<string, string>();
			for (const program of programs) {
				nextProgramNamesById.set(program.id, program.name);
			}
			programNamesById = nextProgramNamesById;
		} catch (error) {
			console.warn('Failed to load exercise history:', error);
			loadError = 'Unable to load exercise history.';
		} finally {
			loading = false;
		}
	});

	function getProgramName(programId?: string): string {
		if (!programId) return 'Deleted program';
		return programNamesById.get(programId) || 'Deleted program';
	}

	function getCompletedSetCount(entry: ExerciseHistoryEntry): number {
		return entry.sets.filter((set) => set.completed).length;
	}

	function getSetSummary(set: SetLog): string {
		const parts: string[] = [];
		if (set.reps !== undefined) parts.push(`${set.reps} reps`);
		if (set.weight !== undefined) parts.push(`${set.weight} kg`);
		if (set.duration !== undefined) parts.push(`${set.duration}s`);
		return parts.join(' · ') || (set.completed ? 'Done' : 'Not completed');
	}

	const totalEntriesWithNotes = $derived(entries.filter((entry) => Boolean(entry.notes?.trim())).length);
	const lastPerformedAt = $derived(entries[0]?.performedAt);
</script>

<div class="space-y-6 animate-slideUp">
	<div class="flex items-center gap-3">
		<button
			type="button"
			onclick={() => goto('/history')}
			class="p-2 rounded-xl hover:bg-border-soft transition-colors touch-target"
			aria-label="Back to history"
		>
			<ArrowLeft size={24} class="text-primary" />
		</button>
		<div class="min-w-0">
			<h1 class="text-xl font-bold text-primary truncate">{exerciseName}</h1>
			<p class="text-sm text-secondary">Exercise history</p>
		</div>
	</div>

	{#if loading}
		<div class="flex justify-center py-12">
			<LoadingSpinner size="lg" />
		</div>
	{:else if loadError}
		<Card padding="lg">
			<div class="space-y-3 text-center py-4">
				<h2 class="text-lg font-semibold text-primary">{loadError}</h2>
				<Button onclick={() => goto('/history')} variant="secondary">
					{#snippet children()}
						Back to history
					{/snippet}
				</Button>
			</div>
		</Card>
	{:else if entries.length === 0}
		<Card padding="lg" variant="info">
			<div class="text-center py-6 space-y-3">
				<div class="w-16 h-16 mx-auto rounded-2xl bg-border-soft flex items-center justify-center">
					<History size={28} class="text-muted" />
				</div>
				<h2 class="text-lg font-semibold text-primary">No history yet</h2>
				<p class="text-sm text-secondary">Complete this exercise in a workout to build history.</p>
			</div>
		</Card>
	{:else}
		<Card>
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
				<div class="rounded-xl bg-border-soft border border-theme px-4 py-3">
					<p class="text-xs text-muted uppercase tracking-wide">Logged sessions</p>
					<p class="text-xl font-semibold text-primary mt-1">{entries.length}</p>
				</div>
				<div class="rounded-xl bg-border-soft border border-theme px-4 py-3">
					<p class="text-xs text-muted uppercase tracking-wide">Entries with notes</p>
					<p class="text-xl font-semibold text-primary mt-1">{totalEntriesWithNotes}</p>
				</div>
				<div class="rounded-xl bg-border-soft border border-theme px-4 py-3">
					<p class="text-xs text-muted uppercase tracking-wide">Last performed</p>
					<p class="text-sm font-semibold text-primary mt-1">
						{lastPerformedAt ? formatDate(lastPerformedAt, 'MMM d, yyyy') : 'N/A'}
					</p>
				</div>
			</div>
		</Card>

		<div class="space-y-3">
			{#each entries as entry}
				<Card>
					<div class="space-y-3">
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<h2 class="font-semibold text-primary truncate">
									{entry.workoutNameSnapshot || entry.exerciseName || 'Workout'}
								</h2>
								<p class="text-sm text-secondary">{getProgramName(entry.programId)}</p>
								<div class="flex items-center gap-2 text-xs text-muted mt-1">
									<Clock size={12} />
									<span>{formatDate(entry.performedAt, 'MMM d, yyyy · h:mm a')}</span>
									<span>·</span>
									<span>{getCompletedSetCount(entry)}/{entry.sets.length} sets completed</span>
								</div>
							</div>
							<Button onclick={() => goto(`/history/${entry.sessionId}`)} size="sm" variant="secondary">
								{#snippet children()}
									Open
								{/snippet}
							</Button>
						</div>

						<div class="space-y-1.5">
							{#each entry.sets as set}
								<div class="flex items-center gap-2 px-3 py-2 rounded-lg border {set.completed ? 'border-success-soft bg-success-soft' : 'border-theme bg-border-soft'}">
									{#if set.completed}
										<CheckCircle size={14} class="text-success" />
									{:else}
										<div class="w-[14px] h-[14px] rounded-full border border-theme"></div>
									{/if}
									<p class="text-sm text-primary">
										Set {set.setNumber}: <span class="text-secondary">{getSetSummary(set)}</span>
									</p>
								</div>
							{/each}
						</div>

						{#if entry.notes?.trim()}
							<div class="rounded-xl border border-brand-soft bg-brand-soft px-3 py-2.5">
								<p class="text-xs font-semibold uppercase tracking-wide text-brand flex items-center gap-1.5">
									<MessageSquare size={12} />
									Note
								</p>
								<p class="text-sm text-primary mt-1 whitespace-pre-wrap break-words">{entry.notes}</p>
							</div>
						{/if}
					</div>
				</Card>
			{/each}
		</div>
	{/if}
</div>
