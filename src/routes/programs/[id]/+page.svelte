<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { programRepository } from '$lib/services/storage/program-repository';
	import type { Program } from '$lib/types/program';
	import WorkoutCard from '$lib/components/program/WorkoutCard.svelte';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';
	import Card from '$lib/components/shared/Card.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import { formatDate, DAY_NAMES } from '$lib/utils/date-helpers';
	import { ArrowLeft, Calendar, Trash2, Sparkles } from 'lucide-svelte';

	let program = $state<Program | null>(null);
	let loading = $state(true);

	onMount(async () => {
		const id = $page.params.id;
		if (id) {
			const loaded = await programRepository.get(id);
			program = loaded || null;
		}
		loading = false;
	});

	async function handleDelete() {
		if (!program) return;
		if (confirm('Are you sure you want to delete this program?')) {
			await programRepository.delete(program.id);
			goto('/');
		}
	}
</script>

{#if loading}
	<div class="flex justify-center py-12">
		<LoadingSpinner size="lg" />
	</div>
{:else if !program}
	<Card>
		<div class="text-center py-12">
			<p class="text-secondary">Program not found</p>
			<Button onclick={() => goto('/')}>
				{#snippet children()}
					Go Home
				{/snippet}
			</Button>
		</div>
	</Card>
{:else}
	<div class="space-y-6">
		<div class="flex items-center gap-4">
			<button
				onclick={() => goto('/')}
				class="text-secondary hover:text-primary touch-target"
			>
				<ArrowLeft size={24} />
			</button>
			<h1 class="text-2xl font-bold text-primary flex-1">{program.name}</h1>
			<button
				onclick={handleDelete}
				class="text-red-600 hover:text-red-700 touch-target"
			>
				<Trash2 size={20} />
			</button>
		</div>

		<Card>
			<div class="space-y-4">
				<div>
					<h2 class="text-sm font-medium text-muted uppercase">Description</h2>
					<p class="mt-1 text-primary">{program.description}</p>
				</div>

				<div>
					<h2 class="text-sm font-medium text-muted uppercase">Schedule</h2>
					<div class="mt-2 flex flex-wrap gap-2">
						{#each program.schedule.weeklyPattern as pattern}
							<span class="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-sm font-medium">
								{DAY_NAMES[pattern.dayOfWeek]}
							</span>
						{/each}
					</div>
				</div>

				<div>
					<h2 class="text-sm font-medium text-muted uppercase">Started</h2>
					<p class="mt-1 text-primary">{formatDate(program.startDate)}</p>
				</div>
			</div>
		</Card>

		<div>
			<h2 class="text-xl font-semibold text-primary mb-3">Workouts</h2>
			<div class="space-y-3">
				{#each program.workouts as workout}
					<WorkoutCard {workout} />
				{/each}
			</div>
		</div>

		<div class="space-y-3">
			<Button onclick={() => goto('/calendar')} fullWidth={true} size="lg">
				{#snippet children()}
					<Calendar size={20} />
					View Calendar
				{/snippet}
			</Button>

			<Button onclick={() => goto(`/programs/${program!.id}/adapt`)} fullWidth={true} size="lg" variant="secondary">
				{#snippet children()}
					<Sparkles size={20} />
					Adapt Program with AI
				{/snippet}
			</Button>
		</div>
	</div>
{/if}
