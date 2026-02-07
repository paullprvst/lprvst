<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Program } from '$lib/types/program';
	import Card from '../shared/Card.svelte';
	import { DAY_NAMES_SHORT } from '$lib/utils/date-helpers';
	import { Dumbbell } from 'lucide-svelte';

	interface Props {
		program: Program;
	}

	let { program }: Props = $props();

	const workoutDays = $derived(
		program.schedule.weeklyPattern.map((p) => DAY_NAMES_SHORT[p.dayOfWeek]).join(', ')
	);

	const scheduleLabel = $derived(() => {
		const workoutDaysCount = program.schedule.weeklyPattern.length;
		if (workoutDaysCount === 7) return 'Daily';
		if (workoutDaysCount >= 5) return `${workoutDaysCount} days/week`;
		return workoutDays;
	});
</script>

<Card variant="interactive" onclick={() => goto(`/programs/${program.id}`)}>
	<div class="flex items-center gap-3 sm:gap-4">
		<!-- Icon -->
		<div
			class="hidden sm:flex flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[rgb(var(--color-primary))] via-[rgb(var(--color-primary-hover))] to-[rgb(var(--color-accent-secondary))] items-center justify-center shadow-[0_16px_24px_-18px_rgb(var(--color-primary)/0.9)]"
		>
			<Dumbbell class="text-[rgb(3_12_20)]" size={24} />
		</div>

		<!-- Content -->
		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-2">
				<h3 class="font-semibold text-primary truncate">{program.name}</h3>
				{#if program.isPaused}
					<span
						class="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-warning-soft text-warning border border-warning-soft flex-shrink-0"
					>
						Paused
					</span>
				{/if}
			</div>
			<p class="hidden sm:block text-sm text-secondary line-clamp-1 mt-0.5">{program.description}</p>

			<!-- Meta info -->
			<div class="flex items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2 text-xs text-muted">
				<span>{scheduleLabel()}</span>
				<span class="text-[rgb(var(--color-border))]">|</span>
				<span>{program.workouts.length} workouts</span>
			</div>
		</div>

		</div>
	</Card>
