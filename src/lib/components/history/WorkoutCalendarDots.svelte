<script lang="ts">
	import { startOfMonth, endOfMonth, eachDayOfInterval, subMonths, isSameDay, format } from 'date-fns';
	import type { WorkoutSession } from '$lib/types/workout-session';

	interface Props {
		sessions: WorkoutSession[];
	}

	let { sessions }: Props = $props();

	// Get workout dates as a Set for quick lookup
	const workoutDates = $derived(
		sessions
			.filter((s) => s.completedAt)
			.map((s) => s.completedAt!.toDateString())
	);

	// Generate last 3 months
	const months = $derived(() => {
		const today = new Date();
		const result = [];

		for (let i = 2; i >= 0; i--) {
			const monthDate = subMonths(today, i);
			const start = startOfMonth(monthDate);
			const end = endOfMonth(monthDate);
			const days = eachDayOfInterval({ start, end });

			result.push({
				label: format(monthDate, 'MMM'),
				days
			});
		}

		return result;
	});

	function hasWorkout(date: Date): boolean {
		return workoutDates.includes(date.toDateString());
	}

	function isToday(date: Date): boolean {
		return isSameDay(date, new Date());
	}

	function isFuture(date: Date): boolean {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return date > today;
	}
</script>

<div class="flex justify-center gap-4 sm:gap-6">
	{#each months() as month}
		<div class="flex flex-col items-center">
			<div class="text-xs text-muted mb-1.5 font-medium">{month.label}</div>
			<div class="grid grid-cols-7 gap-1">
				{#each month.days as day}
					<div
						class="w-2.5 h-2.5 rounded-full transition-colors {hasWorkout(day)
							? 'bg-emerald-500'
							: isToday(day)
								? 'bg-cyan-500/50 ring-1 ring-cyan-500'
								: isFuture(day)
									? 'bg-[rgb(var(--color-border)/0.3)]'
									: 'bg-[rgb(var(--color-border)/0.5)]'}"
						title={format(day, 'MMM d, yyyy')}
					></div>
				{/each}
			</div>
		</div>
	{/each}
</div>
