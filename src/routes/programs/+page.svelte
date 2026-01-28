<script lang="ts">
	import { onMount } from 'svelte';
	import { programRepository } from '$lib/services/storage/program-repository';
	import type { Program } from '$lib/types/program';
	import ProgramList from '$lib/components/program/ProgramList.svelte';
	import Skeleton from '$lib/components/shared/Skeleton.svelte';
	import Card from '$lib/components/shared/Card.svelte';

	let programs = $state<Program[]>([]);
	let loading = $state(true);

	onMount(async () => {
		programs = await programRepository.getAll();
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
