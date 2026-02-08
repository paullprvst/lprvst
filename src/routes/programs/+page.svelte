<svelte:head>
	<title>Programs | AI Fitness Coach</title>
</svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';
	import { programRepository } from '$lib/services/storage/program-repository';
	import { getTabCache, setTabCache } from '$lib/services/tab-cache';
	import { TAB_CACHE_KEYS } from '$lib/services/tab-cache-keys';
	import type { Program } from '$lib/types/program';
	import ProgramList from '$lib/components/program/ProgramList.svelte';
	import Skeleton from '$lib/components/shared/Skeleton.svelte';
	import Card from '$lib/components/shared/Card.svelte';

	const CACHE_TTL_MS = 30_000;
	const cachedPrograms = getTabCache<Program[]>(TAB_CACHE_KEYS.programs, CACHE_TTL_MS);

	let programs = $state<Program[]>(cachedPrograms ?? []);
	let loading = $state(!cachedPrograms);

	onMount(async () => {
		if (cachedPrograms) return;

		programs = await programRepository.getAll();
		setTabCache(TAB_CACHE_KEYS.programs, programs);
		loading = false;
	});
</script>

{#if loading}
	<div class="space-y-6">
		<div class="flex items-center justify-between">
			<Skeleton variant="text" width="180px" height="32px" />
			<Skeleton variant="button" width="80px" />
		</div>
		<div class="space-y-3">
			{#each [1, 2, 3] as i}
				<Card>
					<div class="flex items-center gap-4">
						<Skeleton variant="circular" width="48px" height="48px" />
						<div class="flex-1 space-y-2">
							<Skeleton variant="text" width="60%" />
							<Skeleton variant="text" width="40%" />
						</div>
					</div>
				</Card>
			{/each}
		</div>
	</div>
{:else}
	<ProgramList {programs} />
{/if}
