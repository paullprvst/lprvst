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

<div class="space-y-6 animate-slideUp">
	<!-- Header -->
	<div class="space-y-3 sm:space-y-0 sm:flex sm:items-start sm:justify-between sm:gap-6">
		<div class="min-w-0">
			<p class="hidden sm:block text-[11px] font-semibold tracking-[0.1em] uppercase text-muted">Training</p>
			<h1 class="text-3xl sm:text-4xl font-bold text-primary">Your Programs</h1>
			<p class="text-sm text-secondary mt-1">
				Manage active plans.
			</p>
		</div>
		<div class="sm:pt-1">
			<Button onclick={() => goto('/onboarding')} size="sm">
				{#snippet children()}
					<Plus size={16} class="hidden sm:block" />
					<span class="whitespace-nowrap">New Program</span>
				{/snippet}
			</Button>
		</div>
	</div>

	{#if programs.length === 0}
		<!-- Empty state -->
		<Card padding="lg" variant="info">
			<div class="text-center py-8 space-y-4">
				<div
					class="w-20 h-20 mx-auto rounded-2xl bg-border-soft flex items-center justify-center"
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
