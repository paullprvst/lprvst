<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Program } from '$lib/types/program';
	import Card from '../shared/Card.svelte';
	import { formatDate, DAY_NAMES_SHORT } from '$lib/utils/date-helpers';
	import { Dumbbell, Calendar } from 'lucide-svelte';

	interface Props {
		program: Program;
	}

	let { program }: Props = $props();

	const workoutDays = $derived(
		program.schedule.weeklyPattern
			.map(p => DAY_NAMES_SHORT[p.dayOfWeek])
			.join(', ')
	);
</script>

<button
	onclick={() => goto(`/programs/${program.id}`)}
	class="w-full text-left"
>
	<Card>
		<div class="space-y-3">
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<h3 class="text-lg font-semibold text-gray-900">{program.name}</h3>
					<p class="text-sm text-gray-600 mt-1">{program.description}</p>
				</div>
				<Dumbbell class="text-blue-600 flex-shrink-0 ml-2" size={24} />
			</div>

			<div class="flex items-center gap-4 text-sm text-gray-500">
				<div class="flex items-center gap-1">
					<Calendar size={16} />
					<span>{workoutDays}</span>
				</div>
				<span>•</span>
				<span>{program.workouts.length} workouts</span>
			</div>

			<div class="text-xs text-gray-400">
				Started {formatDate(program.startDate)}
			</div>
		</div>
	</Card>
</button>
