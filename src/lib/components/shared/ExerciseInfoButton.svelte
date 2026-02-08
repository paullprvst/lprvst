<script lang="ts">
	import { Info } from 'lucide-svelte';
	import Modal from './Modal.svelte';
	import LoadingSpinner from './LoadingSpinner.svelte';
	import { getExerciseDescription, type ExerciseDescriptionContext } from '$lib/services/ai/exercise-description-service';
	import { renderMarkdownToHtml } from '$lib/utils/markdown';

	interface Props {
		exerciseName: string;
		equipment?: string[];
		notes?: string;
		size?: number;
	}

	let { exerciseName, equipment, notes, size = 16 }: Props = $props();

	let modalOpen = $state(false);
	let description = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function handleClick(e: MouseEvent) {
		e.stopPropagation();
		modalOpen = true;
		description = '';
		error = null;
		loading = true;

		try {
			const context: ExerciseDescriptionContext = {
				exerciseName,
				equipment,
				notes
			};

			await getExerciseDescription(context, (chunk) => {
				description += chunk;
			});
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load exercise description';
		} finally {
			loading = false;
		}
	}

	function handleClose() {
		modalOpen = false;
	}

</script>

<button
	onclick={handleClick}
	class="text-muted hover:text-brand transition-colors p-1 -m-1"
	title="Exercise info"
	aria-label="View exercise instructions for {exerciseName}"
>
	<Info {size} />
</button>

<Modal bind:open={modalOpen} title={exerciseName} onclose={handleClose}>
	{#snippet children()}
		{#if loading && !description}
			<div class="flex items-center justify-center py-8">
				<LoadingSpinner />
			</div>
		{:else if error}
			<div class="text-error p-4 bg-error-soft border border-error-soft rounded-lg">
				{error}
			</div>
		{:else}
			<div class="prose prose-sm max-w-none">
				{@html renderMarkdownToHtml(description)}
			</div>
			{#if loading}
				<div class="flex items-center gap-2 mt-4 text-secondary text-sm">
					<LoadingSpinner size="sm" />
					<span>Loading...</span>
				</div>
			{/if}
		{/if}
	{/snippet}
</Modal>
