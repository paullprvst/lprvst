<script lang="ts">
	import type { Program } from '$lib/types/program';
	import ProgramCard from './ProgramCard.svelte';
	import { Plus, Dumbbell } from 'lucide-svelte';
	import Button from '../shared/Button.svelte';
	import Card from '../shared/Card.svelte';
	import { goto } from '$app/navigation';

	interface Props {
		programs: Program[];
	}

	let { programs }: Props = $props();
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-2xl font-bold text-primary">Your Programs</h2>
			<p class="text-sm text-secondary mt-1">Manage active plans and start your next session.</p>
		</div>
		<Button onclick={() => goto('/onboarding')} size="sm">
			{#snippet children()}
				<Plus size={18} />
				New Program
			{/snippet}
		</Button>
	</div>

	{#if programs.length === 0}
		<!-- Empty state -->
		<Card padding="lg">
			<div class="text-center py-8 space-y-4">
				<div
					class="w-20 h-20 mx-auto rounded-2xl bg-[rgb(var(--color-border)/0.5)] flex items-center justify-center"
				>
					<Dumbbell size={40} class="text-muted" />
				</div>
				<div class="space-y-2">
					<h3 class="text-lg font-semibold text-primary">No programs yet</h3>
					<p class="text-secondary text-sm max-w-xs mx-auto">
						Create your first program to start your fitness journey with AI-powered guidance.
					</p>
				</div>
				<Button onclick={() => goto('/onboarding')}>
					{#snippet children()}
						<Plus size={20} />
						Create Your First Program
					{/snippet}
				</Button>
			</div>
		</Card>
	{:else}
		<!-- Program list with staggered animation -->
		<div class="space-y-3">
			{#each programs as program, index (program.id)}
				<div class="animate-slideUp" style="animation-delay: {index * 50}ms">
					<ProgramCard {program} />
				</div>
			{/each}
		</div>
	{/if}
</div>
