<script lang="ts">
	import type { Program } from '$lib/types/program';
	import ProgramCard from './ProgramCard.svelte';
	import { Plus } from 'lucide-svelte';
	import Button from '../shared/Button.svelte';
	import { goto } from '$app/navigation';

	interface Props {
		programs: Program[];
	}

	let { programs }: Props = $props();
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-2xl font-bold">Your Programs</h2>
		<Button onclick={() => goto('/onboarding')}>
			{#snippet children()}
				<Plus size={20} />
				New Program
			{/snippet}
		</Button>
	</div>

	{#if programs.length === 0}
		<div class="text-center py-12 bg-white rounded-lg shadow">
			<p class="text-gray-500">No programs yet. Create your first program to get started!</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each programs as program (program.id)}
				<ProgramCard {program} />
			{/each}
		</div>
	{/if}
</div>
