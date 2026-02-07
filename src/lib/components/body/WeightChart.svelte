<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { subMonths } from 'date-fns';
	import { Chart, registerables } from 'chart.js';
	import 'chartjs-adapter-date-fns';
	import type { WeightEntry } from '$lib/types/weight-entry';
	import { TrendingUp } from 'lucide-svelte';

	Chart.register(...registerables);

	type TimeRange = 'month' | 'all';

	interface Props {
		entries: WeightEntry[];
		timeRange?: TimeRange;
	}

	let { entries, timeRange = 'month' }: Props = $props();

	let canvas = $state<HTMLCanvasElement | null>(null);
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
		const styles = getComputedStyle(document.documentElement);
		const primary = styles.getPropertyValue('--color-primary').trim() || '34 211 238';
		const border = styles.getPropertyValue('--color-border').trim() || '55 55 72';
		const textPrimary = styles.getPropertyValue('--color-text-primary').trim() || '250 250 255';
		const textMuted = styles.getPropertyValue('--color-text-muted').trim() || '130 130 155';
		const surfaceElevated = styles.getPropertyValue('--color-surface-elevated').trim() || '36 36 48';
		const primaryRgb = `rgb(${primary})`;

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
						borderColor: primaryRgb,
						backgroundColor: `rgba(${primary}, 0.14)`,
						fill: true,
						tension: 0.3,
						pointBackgroundColor: primaryRgb,
						pointBorderColor: primaryRgb,
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
						backgroundColor: `rgba(${surfaceElevated}, 0.96)`,
						titleColor: `rgb(${textPrimary})`,
						bodyColor: `rgb(${textPrimary})`,
						borderColor: `rgba(${border}, 0.45)`,
						borderWidth: 1,
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
							color: `rgb(${textMuted})`,
							maxRotation: 0,
							autoSkip: true,
							maxTicksLimit: 6
						}
					},
					y: {
						grid: {
							color: `rgba(${border}, 0.2)`
						},
						ticks: {
							color: `rgb(${textMuted})`,
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
	<div class="text-center py-7 space-y-3">
		<div
			class="w-11 h-11 mx-auto rounded-xl bg-[rgb(var(--color-border)/0.36)] flex items-center justify-center"
		>
			<TrendingUp size={22} class="text-muted" />
		</div>
		<div class="space-y-1">
			<p class="text-secondary font-medium">Not enough data</p>
			<p class="text-sm text-muted">Add at least 2 entries to see your trend line.</p>
		</div>
	</div>
{:else}
	<div class="h-52 sm:h-56">
		<canvas bind:this={canvas}></canvas>
	</div>
{/if}
