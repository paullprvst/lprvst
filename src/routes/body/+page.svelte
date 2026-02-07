<svelte:head>
	<title>Body | AI Fitness Coach</title>
</svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';
	import { weightRepository } from '$lib/services/storage/weight-repository';
	import type { WeightEntry, WeightEntryInput } from '$lib/types/weight-entry';
	import WeightChart from '$lib/components/body/WeightChart.svelte';
	import WeightEntryForm from '$lib/components/body/WeightEntryForm.svelte';
	import WeightEntryList from '$lib/components/body/WeightEntryList.svelte';
	import Card from '$lib/components/shared/Card.svelte';
	import Skeleton from '$lib/components/shared/Skeleton.svelte';
	import { Scale, TrendingDown, TrendingUp, Target } from 'lucide-svelte';

	type TimeRange = 'month' | 'all';

	let entries = $state<WeightEntry[]>([]);
	let loading = $state(true);
	let chartTimeRange = $state<TimeRange>('month');

	const currentWeight = $derived(entries[0]?.weight);
	const startWeight = $derived(entries[entries.length - 1]?.weight);
	const totalChange = $derived(
		currentWeight && startWeight ? currentWeight - startWeight : undefined
	);

	onMount(async () => {
		await loadEntries();
	});

	async function loadEntries() {
		loading = true;
		try {
			entries = await weightRepository.getAll();
		} finally {
			loading = false;
		}
	}

	async function handleSubmit(input: WeightEntryInput) {
		await weightRepository.create({
			weight: input.weight,
			recordedAt: input.recordedAt,
			notes: input.notes
		});
		await loadEntries();
	}

	async function handleDelete(id: string) {
		await weightRepository.delete(id);
		await loadEntries();
	}
</script>

<div class="space-y-6 animate-slideUp">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<div
			class="w-10 h-10 rounded-xl bg-[rgb(var(--color-primary)/0.1)] flex items-center justify-center"
		>
			<Scale size={20} class="text-[rgb(var(--color-primary))]" />
		</div>
		<h1 class="text-2xl font-bold text-primary">Body</h1>
	</div>

	{#if loading}
		<!-- Loading Skeletons -->
		<div class="grid grid-cols-3 gap-3">
			{#each [1, 2, 3] as i}
				<Skeleton variant="card" height="80px" />
			{/each}
		</div>
		<Skeleton variant="card" height="200px" />
		<Skeleton variant="card" height="150px" />
	{:else}
		<!-- Stats Cards -->
		<div class="grid grid-cols-3 gap-3">
			<Card padding="sm">
				<div class="text-center">
					<div class="flex items-center justify-center gap-1 mb-1">
						<Scale size={14} class="text-brand" />
						<span class="text-xs text-muted">Current</span>
					</div>
					<p class="text-lg font-bold text-primary">
						{currentWeight ? `${currentWeight.toFixed(1)}` : '-'}
					</p>
					<p class="text-xs text-muted">kg</p>
				</div>
			</Card>

			<Card padding="sm">
				<div class="text-center">
					<div class="flex items-center justify-center gap-1 mb-1">
						<Target size={14} class="text-accent" />
						<span class="text-xs text-muted">Start</span>
					</div>
					<p class="text-lg font-bold text-primary">
						{startWeight ? `${startWeight.toFixed(1)}` : '-'}
					</p>
					<p class="text-xs text-muted">kg</p>
				</div>
			</Card>

			<Card padding="sm">
				<div class="text-center">
					<div class="flex items-center justify-center gap-1 mb-1">
						{#if totalChange && totalChange < 0}
							<TrendingDown size={14} class="text-success" />
						{:else if totalChange && totalChange > 0}
							<TrendingUp size={14} class="text-warning" />
						{:else}
							<TrendingUp size={14} class="text-muted" />
						{/if}
						<span class="text-xs text-muted">Change</span>
					</div>
					<p
						class="text-lg font-bold {totalChange && totalChange < 0
							? 'text-success'
							: totalChange && totalChange > 0
								? 'text-warning'
								: 'text-primary'}"
					>
						{totalChange !== undefined
							? `${totalChange > 0 ? '+' : ''}${totalChange.toFixed(1)}`
							: '-'}
					</p>
					<p class="text-xs text-muted">kg</p>
				</div>
			</Card>
		</div>

		<!-- Weight Chart -->
		<section>
			<div class="flex items-center justify-between mb-3">
				<h2 class="text-sm font-semibold text-secondary">Trend</h2>
				<div class="flex items-center gap-1 p-1 rounded-lg bg-[rgb(var(--color-border)/0.3)]">
					<button
						class="px-3 py-1 text-xs font-medium rounded-md transition-colors {chartTimeRange === 'month'
							? 'bg-[rgb(var(--color-surface))] text-primary shadow-sm'
							: 'text-muted hover:text-secondary'}"
						onclick={() => (chartTimeRange = 'month')}
					>
						Month
					</button>
					<button
						class="px-3 py-1 text-xs font-medium rounded-md transition-colors {chartTimeRange === 'all'
							? 'bg-[rgb(var(--color-surface))] text-primary shadow-sm'
							: 'text-muted hover:text-secondary'}"
						onclick={() => (chartTimeRange = 'all')}
					>
						All time
					</button>
				</div>
			</div>
			<WeightChart {entries} timeRange={chartTimeRange} />
		</section>

		<!-- Entry Form -->
		<section>
			<h2 class="text-sm font-semibold text-secondary mb-3">Log Weight</h2>
			<Card>
				<WeightEntryForm onsubmit={handleSubmit} />
			</Card>
		</section>

		<!-- Entry List -->
		{#if entries.length > 0}
			<section>
				<h2 class="text-sm font-semibold text-secondary mb-3">Recent Entries</h2>
				<WeightEntryList {entries} ondelete={handleDelete} />
			</section>
		{/if}
	{/if}
</div>
