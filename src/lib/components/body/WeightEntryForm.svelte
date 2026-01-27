<script lang="ts">
	import { weightEntrySchema, type WeightEntryInput } from '$lib/types/weight-entry';
	import Button from '$lib/components/shared/Button.svelte';
	import { Plus } from 'lucide-svelte';

	interface Props {
		onsubmit: (entry: WeightEntryInput) => Promise<void>;
	}

	let { onsubmit }: Props = $props();

	let weight = $state('');
	let recordedAt = $state(new Date().toISOString().split('T')[0]);
	let notes = $state('');
	let error = $state<string | null>(null);
	let loading = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = null;

		const weightNum = parseFloat(weight);
		const input: WeightEntryInput = {
			weight: weightNum,
			recordedAt: new Date(recordedAt),
			notes: notes.trim() || undefined
		};

		const result = weightEntrySchema.safeParse(input);
		if (!result.success) {
			error = result.error.errors[0]?.message || 'Invalid input';
			return;
		}

		loading = true;
		try {
			await onsubmit(result.data);
			weight = '';
			notes = '';
			recordedAt = new Date().toISOString().split('T')[0];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to save entry';
		} finally {
			loading = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="space-y-4">
	<div class="flex gap-3">
		<div class="flex-1">
			<label for="weight" class="block text-sm font-medium text-secondary mb-1.5">
				Weight (kg)
			</label>
			<input
				id="weight"
				type="number"
				step="0.1"
				min="20"
				max="500"
				bind:value={weight}
				placeholder="75.0"
				required
				class="w-full px-4 py-3 bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] rounded-xl text-[rgb(var(--color-text-primary))] placeholder:text-[rgb(var(--color-text-muted))] input-focus-ring"
			/>
		</div>
		<div class="flex-1">
			<label for="date" class="block text-sm font-medium text-secondary mb-1.5">Date</label>
			<input
				id="date"
				type="date"
				bind:value={recordedAt}
				required
				class="w-full px-4 py-3 bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] rounded-xl text-[rgb(var(--color-text-primary))] input-focus-ring"
			/>
		</div>
	</div>

	<div>
		<label for="notes" class="block text-sm font-medium text-secondary mb-1.5">
			Notes (optional)
		</label>
		<input
			id="notes"
			type="text"
			bind:value={notes}
			placeholder="Morning weigh-in"
			maxlength="500"
			class="w-full px-4 py-3 bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] rounded-xl text-[rgb(var(--color-text-primary))] placeholder:text-[rgb(var(--color-text-muted))] input-focus-ring"
		/>
	</div>

	{#if error}
		<p class="text-sm text-[rgb(var(--color-error))]">{error}</p>
	{/if}

	<Button variant="primary" fullWidth {loading}>
		<Plus size={18} />
		Add Entry
	</Button>
</form>
