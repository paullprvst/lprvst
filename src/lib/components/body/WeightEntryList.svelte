<script lang="ts">
	import type { WeightEntry } from '$lib/types/weight-entry';
	import Card from '$lib/components/shared/Card.svelte';
	import { formatDate } from '$lib/utils/date-helpers';
	import { Trash2, TrendingDown, TrendingUp, Minus } from 'lucide-svelte';

	interface Props {
		entries: WeightEntry[];
		ondelete: (id: string) => Promise<void>;
	}

	let { entries, ondelete }: Props = $props();
	let deletingId = $state<string | null>(null);

	async function handleDelete(id: string) {
		deletingId = id;
		try {
			await ondelete(id);
		} finally {
			deletingId = null;
		}
	}

	function getChange(index: number): { value: number; direction: 'up' | 'down' | 'same' } | null {
		if (index >= entries.length - 1) return null;
		const current = entries[index].weight;
		const previous = entries[index + 1].weight;
		const diff = current - previous;

		if (Math.abs(diff) < 0.05) return { value: 0, direction: 'same' };
		return {
			value: diff,
			direction: diff > 0 ? 'up' : 'down'
		};
	}
</script>

<div class="space-y-2">
	{#each entries as entry, index (entry.id)}
		{@const change = getChange(index)}
		<Card padding="sm">
			<div class="flex items-center gap-3">
				<div class="flex-1">
					<div class="flex items-center gap-2">
						<span class="text-lg font-semibold text-primary">{entry.weight.toFixed(1)} kg</span>
						{#if change}
							{@const changeColor =
								change.direction === 'down'
									? 'text-success'
									: change.direction === 'up'
										? 'text-warning'
										: 'text-muted'}
							<span class="flex items-center gap-0.5 text-sm {changeColor}">
								{#if change.direction === 'down'}
									<TrendingDown size={14} />
								{:else if change.direction === 'up'}
									<TrendingUp size={14} />
								{:else}
									<Minus size={14} />
								{/if}
								{#if change.value !== 0}
									{change.value > 0 ? '+' : ''}{change.value.toFixed(1)}
								{/if}
							</span>
						{/if}
					</div>
					<p class="text-sm text-secondary">{formatDate(entry.recordedAt, 'EEE, MMM d')}</p>
					{#if entry.notes}
						<p class="text-xs text-muted mt-1">{entry.notes}</p>
					{/if}
				</div>
				<button
					onclick={() => handleDelete(entry.id)}
					disabled={deletingId === entry.id}
					class="p-2 rounded-lg text-muted hover:text-[rgb(var(--color-error))] hover:bg-[rgb(var(--color-error)/0.1)] transition-colors disabled:opacity-50"
					aria-label="Delete entry"
				>
					<Trash2 size={18} />
				</button>
			</div>
		</Card>
	{/each}
</div>
