<script lang="ts">
	import type { SetLog } from '$lib/types/workout-session';
	import type { Exercise } from '$lib/types/program';
	import Modal from '../shared/Modal.svelte';
	import Button from '../shared/Button.svelte';
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

	const inputClasses = `
		w-full px-4 py-3
		bg-[rgb(var(--color-surface))]
		border border-[rgb(var(--color-border))]
		rounded-xl
		text-[rgb(var(--color-text-primary))]
		placeholder:text-[rgb(var(--color-text-muted))]
		input-focus-ring
	`;
</script>

<Modal bind:open title={modalTitle} size="sm">
	<div class="space-y-5">
		<!-- Target reminder -->
		<div class="p-3 bg-cyan-500/10 rounded-xl border border-cyan-300 dark:border-cyan-500/30">
			<p class="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wide mb-1">Target</p>
			<p class="text-sm text-primary">{exercise.reps || `${exercise.duration}s`}</p>
		</div>

		<!-- Reps input -->
		<div>
			<label class="block text-sm font-medium text-secondary mb-2">Reps completed</label>
			<input
				type="number"
				bind:value={reps}
				min="0"
				placeholder="e.g., 12"
				class={inputClasses}
			/>
		</div>

		<!-- Weight input -->
		<div>
			<label class="block text-sm font-medium text-secondary mb-2">Weight (lbs/kg)</label>
			<input
				type="number"
				bind:value={weight}
				min="0"
				step="0.5"
				placeholder="e.g., 45"
				class={inputClasses}
			/>
		</div>

		<!-- Duration input (for time-based) -->
		{#if exercise.duration || (exercise.reps && /\d+\s*(seconds?|sec|s|minutes?|min|m)\b/i.test(exercise.reps))}
			<div>
				<label class="block text-sm font-medium text-secondary mb-2">Duration (seconds)</label>
				<input
					type="number"
					bind:value={duration}
					min="0"
					placeholder="e.g., 60"
					class={inputClasses}
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
