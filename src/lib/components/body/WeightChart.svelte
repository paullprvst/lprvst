<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	import type { WeightEntry } from '$lib/types/weight-entry';
	import Card from '$lib/components/shared/Card.svelte';
	import { TrendingUp } from 'lucide-svelte';

	Chart.register(...registerables);

	interface Props {
		entries: WeightEntry[];
	}

	let { entries }: Props = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	const sortedEntries = $derived(
		[...entries].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime())
	);

	function createChart() {
		if (!canvas || sortedEntries.length < 2) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		if (chart) {
			chart.destroy();
		}

		const labels = sortedEntries.map((e) =>
			e.recordedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
		);
		const data = sortedEntries.map((e) => e.weight);

		chart = new Chart(ctx, {
			type: 'line',
			data: {
				labels,
				datasets: [
					{
						label: 'Weight (kg)',
						data,
						borderColor: 'rgb(6, 182, 212)',
						backgroundColor: 'rgba(6, 182, 212, 0.1)',
						fill: true,
						tension: 0.3,
						pointBackgroundColor: 'rgb(6, 182, 212)',
						pointBorderColor: 'rgb(6, 182, 212)',
						pointRadius: 4,
						pointHoverRadius: 6
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					intersect: false,
					mode: 'index'
				},
				plugins: {
					legend: {
						display: false
					},
					tooltip: {
						backgroundColor: 'rgba(0, 0, 0, 0.8)',
						titleColor: 'rgb(255, 255, 255)',
						bodyColor: 'rgb(255, 255, 255)',
						padding: 12,
						cornerRadius: 8,
						callbacks: {
							label: (context) => `${context.parsed.y?.toFixed(1) ?? '-'} kg`
						}
					}
				},
				scales: {
					x: {
						grid: {
							display: false
						},
						ticks: {
							color: 'rgb(156, 163, 175)',
							maxRotation: 0,
							autoSkip: true,
							maxTicksLimit: 6
						}
					},
					y: {
						grid: {
							color: 'rgba(156, 163, 175, 0.1)'
						},
						ticks: {
							color: 'rgb(156, 163, 175)',
							callback: (value) => `${value} kg`
						},
						suggestedMin: Math.min(...data) - 1,
						suggestedMax: Math.max(...data) + 1
					}
				}
			}
		});
	}

	$effect(() => {
		if (sortedEntries.length >= 2) {
			createChart();
		}
	});

	onMount(() => {
		createChart();
	});

	onDestroy(() => {
		if (chart) {
			chart.destroy();
		}
	});
</script>

{#if sortedEntries.length < 2}
	<Card padding="lg">
		<div class="text-center py-4 space-y-3">
			<div
				class="w-12 h-12 mx-auto rounded-xl bg-[rgb(var(--color-border)/0.5)] flex items-center justify-center"
			>
				<TrendingUp size={24} class="text-muted" />
			</div>
			<div class="space-y-1">
				<p class="text-secondary font-medium">Not enough data</p>
				<p class="text-sm text-muted">Add at least 2 entries to see your weight trend</p>
			</div>
		</div>
	</Card>
{:else}
	<Card padding="md">
		<div class="h-48">
			<canvas bind:this={canvas}></canvas>
		</div>
	</Card>
{/if}
