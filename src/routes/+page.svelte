<script lang="ts">
	import { onMount } from 'svelte';
	import { programRepository } from '$lib/services/storage/program-repository';
	import type { Program } from '$lib/types/program';
	import ProgramList from '$lib/components/program/ProgramList.svelte';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';

	let programs = $state<Program[]>([]);
	let loading = $state(true);

	onMount(async () => {
		programs = await programRepository.getAll();
		loading = false;
	});
</script>

{#if loading}
	<div class="flex justify-center py-12">
		<LoadingSpinner size="lg" />
	</div>
{:else}
	<ProgramList {programs} />
{/if}
