<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { programRepository } from '$lib/services/storage/program-repository';
	import { workoutSessionRepository } from '$lib/services/storage/workout-session-repository';
	import type { Program } from '$lib/types/program';
	import WeekView from '$lib/components/calendar/WeekView.svelte';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';
	import Card from '$lib/components/shared/Card.svelte';
	import Button from '$lib/components/shared/Button.svelte';

	let programs = $state<Program[]>([]);
	let selectedProgram = $state<Program | null>(null);
	let loading = $state(true);

	onMount(async () => {
		programs = await programRepository.getAll();
		if (programs.length > 0) {
			selectedProgram = programs[0];
		}
		loading = false;
	});

	async function startWorkout(workoutId: string, workoutIndex: number, date: Date) {
		if (!selectedProgram) return;

		const session = await workoutSessionRepository.create({
			workoutId,
			programId: selectedProgram.id,
			status: 'in-progress',
			exercises: selectedProgram.workouts[workoutIndex].exercises.map(e => ({
				exerciseId: e.id,
				sets: Array(e.sets).fill(null).map((_, i) => ({
					setNumber: i + 1,
					completed: false
				}))
			}))
		});

		goto(`/workout/${session.id}`);
	}
</script>

{#if loading}
	<div class="flex justify-center py-12">
		<LoadingSpinner size="lg" />
	</div>
{:else if programs.length === 0}
	<Card>
		<div class="text-center py-12 space-y-4">
			<p class="text-gray-600">No programs yet. Create a program to see your workout calendar.</p>
			<Button onclick={() => goto('/onboarding')}>
				{#snippet children()}
					Create Program
				{/snippet}
			</Button>
		</div>
	</Card>
{:else if selectedProgram}
	<div class="space-y-4">
		{#if programs.length > 1}
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Select Program</label>
				<select
					bind:value={selectedProgram}
					class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					{#each programs as program}
						<option value={program}>{program.name}</option>
					{/each}
				</select>
			</div>
		{/if}

		<WeekView program={selectedProgram} onworkoutclick={startWorkout} />
	</div>
{/if}
