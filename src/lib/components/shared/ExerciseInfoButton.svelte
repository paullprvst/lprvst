<script lang="ts">
	import { Info } from 'lucide-svelte';
	import Modal from './Modal.svelte';
	import LoadingSpinner from './LoadingSpinner.svelte';
	import { getExerciseDescription, type ExerciseDescriptionContext } from '$lib/services/ai/exercise-description-service';

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

	// Simple markdown renderer for our specific format
	function renderMarkdown(text: string): string {
		return text
			// Headers
			.replace(/^## (.+)$/gm, '<h3 class="text-lg font-semibold text-gray-900 mt-4 mb-2">$1</h3>')
			// Bold
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			// Numbered lists
			.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 mb-1"><span class="font-medium">$1.</span> $2</li>')
			// Bullet points
			.replace(/^- (.+)$/gm, '<li class="ml-4 mb-1 list-disc list-inside">$1</li>')
			// Paragraphs (lines not already processed)
			.replace(/^(?!<[hl]|<li)(.+)$/gm, '<p class="mb-2">$1</p>')
			// Clean up empty paragraphs
			.replace(/<p class="mb-2"><\/p>/g, '');
	}
</script>

<button
	onclick={handleClick}
	class="text-gray-400 hover:text-blue-600 transition-colors p-1 -m-1"
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
			<div class="text-red-600 p-4 bg-red-50 rounded-lg">
				{error}
			</div>
		{:else}
			<div class="prose prose-sm max-w-none">
				{@html renderMarkdown(description)}
			</div>
			{#if loading}
				<div class="flex items-center gap-2 mt-4 text-gray-500 text-sm">
					<LoadingSpinner size="sm" />
					<span>Loading...</span>
				</div>
			{/if}
		{/if}
	{/snippet}
</Modal>
