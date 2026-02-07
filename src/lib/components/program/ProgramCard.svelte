<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Program } from '$lib/types/program';
	import Card from '../shared/Card.svelte';
	import { formatDate, DAY_NAMES_SHORT } from '$lib/utils/date-helpers';
	import { Dumbbell, Calendar, ChevronRight } from 'lucide-svelte';

	interface Props {
		program: Program;
	}

	let { program }: Props = $props();

	const workoutDays = $derived(
		program.schedule.weeklyPattern.map((p) => DAY_NAMES_SHORT[p.dayOfWeek]).join(', ')
	);
</script>

<Card variant="interactive" onclick={() => goto(`/programs/${program.id}`)}>
	<div class="flex items-center gap-4">
		<!-- Icon -->
		<div
			class="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-primary-hover))] flex items-center justify-center shadow-sm"
		>
			<Dumbbell class="text-white" size={24} />
		</div>

		<!-- Content -->
		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-2">
				<h3 class="font-semibold text-primary truncate">{program.name}</h3>
				{#if program.isPaused}
					<span
						class="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-amber-500/15 text-amber-600 dark:text-amber-400 flex-shrink-0"
					>
						Paused
					</span>
				{/if}
			</div>
			<p class="text-sm text-secondary line-clamp-1 mt-0.5">{program.description}</p>

			<!-- Meta info -->
			<div class="flex items-center gap-3 mt-2 text-xs text-muted">
				<div class="flex items-center gap-1">
					<Calendar size={12} />
					<span>{workoutDays}</span>
				</div>
				<span class="text-[rgb(var(--color-border))]">|</span>
				<span>{program.workouts.length} workouts</span>
			</div>
		</div>

		<!-- Arrow indicator -->
		<ChevronRight size={20} class="text-muted flex-shrink-0" />
	</div>
</Card>
