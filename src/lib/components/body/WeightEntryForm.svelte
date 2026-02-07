<script lang="ts">
	import { weightEntrySchema, type WeightEntryInput } from '$lib/types/weight-entry';
	import Button from '$lib/components/shared/Button.svelte';
	import Input from '$lib/components/shared/Input.svelte';
	import AlertBanner from '$lib/components/shared/AlertBanner.svelte';
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
			<Input
				id="weight"
				type="number"
				bind:value={weight}
				placeholder="75.0"
				required
				step="0.1"
				min="20"
				max="500"
				inputMode="decimal"
			/>
		</div>
		<div class="flex-1">
			<label for="date" class="block text-sm font-medium text-secondary mb-1.5">Date</label>
			<Input id="date" type="date" bind:value={recordedAt} required />
		</div>
	</div>

	<div>
		<label for="notes" class="block text-sm font-medium text-secondary mb-1.5">
			Notes (optional)
		</label>
		<Input
			id="notes"
			type="text"
			bind:value={notes}
			placeholder="Morning weigh-in"
			maxLength={500}
		/>
	</div>

	{#if error}
		<AlertBanner variant="error" title="Could not save entry" message={error} />
	{/if}

	<Button variant="primary" type="submit" fullWidth {loading} loadingLabel="Saving entry...">
		{#snippet children()}
			<Plus size={18} />
			Add Entry
		{/snippet}
	</Button>
</form>
