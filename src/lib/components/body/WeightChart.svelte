<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { subMonths } from 'date-fns';
	import { Chart, registerables } from 'chart.js';
	import 'chartjs-adapter-date-fns';
	import type { WeightEntry } from '$lib/types/weight-entry';
	import Card from '$lib/components/shared/Card.svelte';
	import { TrendingUp } from 'lucide-svelte';

	Chart.register(...registerables);

	type TimeRange = 'month' | 'all';

	interface Props {
		entries: WeightEntry[];
		timeRange?: TimeRange;
	}

	let { entries, timeRange = 'month' }: Props = $props();

	let canvas: HTMLCanvasElement;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let chart: Chart<'line', any> | null = null;

	const sortedEntries = $derived(() => {
		return [...entries].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
	});

	function getChartData() {
		const sorted = sortedEntries();

		if (timeRange === 'all') {
			return sorted.map((e) => ({ x: e.recordedAt, y: e.weight }));
		}

		// For month view, filter and add inferred starting point
		const oneMonthAgo = subMonths(new Date(), 1);
		const inRange = sorted.filter((e) => e.recordedAt >= oneMonthAgo);

		// Find the last entry before the range to infer starting value
		const beforeRange = sorted.filter((e) => e.recordedAt < oneMonthAgo);
		const lastBeforeRange = beforeRange[beforeRange.length - 1];

		const data = inRange.map((e) => ({ x: e.recordedAt, y: e.weight }));

		// Add inferred starting point at the beginning of the range
		if (lastBeforeRange) {
			data.unshift({ x: oneMonthAgo, y: lastBeforeRange.weight });
		} else if (data.length > 0) {
			// No data before range, extend first point to start
			data.unshift({ x: oneMonthAgo, y: data[0].y });
		}

		return data;
	}

	function createChart() {
		const data = getChartData();
		if (!canvas || data.length < 2) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		if (chart) {
			chart.destroy();
		}

		const weights = data.map((d) => d.y);

		// Set x-axis bounds based on time range
		const now = new Date();
		const xMin = timeRange === 'month' ? subMonths(now, 1).getTime() : undefined;
		const xMax = timeRange === 'month' ? now.getTime() : undefined;

		chart = new Chart(ctx, {
			type: 'line',
			data: {
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
						type: 'time',
						min: xMin,
						max: xMax,
						time: {
							unit: 'day',
							displayFormats: {
								day: 'MMM d'
							},
							tooltipFormat: 'MMM d, yyyy'
						},
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
						suggestedMin: Math.min(...weights) - 1,
						suggestedMax: Math.max(...weights) + 1
					}
				}
			}
		});
	}

	$effect(() => {
		if (getChartData().length >= 2) {
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

{#if getChartData().length < 2}
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
