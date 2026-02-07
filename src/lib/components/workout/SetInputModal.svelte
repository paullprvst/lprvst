<script lang="ts">
	import type { SetLog } from '$lib/types/workout-session';
	import type { Exercise } from '$lib/types/program';
	import Modal from '../shared/Modal.svelte';
	import Button from '../shared/Button.svelte';
	import Input from '../shared/Input.svelte';
	import { Check, Save } from 'lucide-svelte';

	interface Props {
		open: boolean;
		set: SetLog | null;
		exercise: Exercise;
		onsave: (setNumber: number, data: { reps?: number; weight?: number; duration?: number }) => void;
	}

	let { open = $bindable(), set, exercise, onsave }: Props = $props();

	let reps = $state<number | undefined>(undefined);
	let weight = $state<number | undefined>(undefined);
	let duration = $state<number | undefined>(undefined);

	const isCompleted = $derived(set?.completed ?? false);
	const modalTitle = $derived(
		set ? (isCompleted ? `Edit Set ${set.setNumber}` : `Complete Set ${set.setNumber}`) : 'Log Set'
	);

	// Reset values when modal opens with new set
	$effect(() => {
		if (open && set) {
			reps = set.reps;
			weight = set.weight;
			duration = set.duration;
		}
	});

	function handleSave() {
		if (!set) return;
		onsave(set.setNumber, {
			reps: reps || undefined,
			weight: weight || undefined,
			duration: duration || undefined
		});
		open = false;
	}

	function handleQuickComplete() {
		if (!set) return;
		onsave(set.setNumber, {});
		open = false;
	}

</script>

<Modal bind:open title={modalTitle} size="sm">
	<div class="space-y-5">
		<!-- Target reminder -->
		<div class="p-3 bg-brand-soft rounded-xl border border-brand-soft">
			<p class="text-xs font-semibold text-brand uppercase tracking-wide mb-1">Target</p>
			<p class="text-sm text-primary">{exercise.reps || `${exercise.duration}s`}</p>
		</div>

		<!-- Reps input -->
		<div>
			<label for="set-reps-input" class="block text-sm font-medium text-secondary mb-2">Reps completed</label>
			<Input
				id="set-reps-input"
				type="number"
				bind:value={reps}
				min="0"
				placeholder="e.g., 12"
				inputMode="numeric"
			/>
		</div>

		<!-- Weight input -->
		<div>
			<label for="set-weight-input" class="block text-sm font-medium text-secondary mb-2">Weight (kg)</label>
			<Input
				id="set-weight-input"
				type="number"
				bind:value={weight}
				min="0"
				step="0.5"
				placeholder="e.g., 45"
				inputMode="decimal"
			/>
		</div>

		<!-- Duration input (for time-based) -->
		{#if exercise.duration || (exercise.reps && /\d+\s*(seconds?|sec|s|minutes?|min|m)\b/i.test(exercise.reps))}
			<div>
				<label for="set-duration-input" class="block text-sm font-medium text-secondary mb-2">Duration (seconds)</label>
				<Input
					id="set-duration-input"
					type="number"
					bind:value={duration}
					min="0"
					placeholder="e.g., 60"
					inputMode="numeric"
				/>
			</div>
		{/if}

		<!-- Buttons -->
		<div class="space-y-2">
			<Button onclick={handleSave} fullWidth={true}>
				{#snippet children()}
					<Save size={18} />
					{isCompleted ? 'Update' : 'Save & Complete'}
				{/snippet}
			</Button>

			{#if !isCompleted}
				<Button onclick={handleQuickComplete} variant="ghost" fullWidth={true}>
					{#snippet children()}
						<Check size={18} />
						Just Complete (no log)
					{/snippet}
				</Button>
			{/if}
		</div>
	</div>
</Modal>
