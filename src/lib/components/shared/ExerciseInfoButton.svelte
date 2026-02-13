<script lang="ts">
	import { Info, Play } from 'lucide-svelte';
	import Modal from './Modal.svelte';
	import LoadingSpinner from './LoadingSpinner.svelte';
	import {
		getCachedExerciseDescription,
		getExerciseDescription,
		type ExerciseDescriptionContext
	} from '$lib/services/ai/exercise-description-service';
	import { getExerciseVideos } from '$lib/services/ai/exercise-video-service';
	import type { ExerciseVideo } from '$lib/services/storage/exercise-video-repository';
	import { renderMarkdownToHtml } from '$lib/utils/markdown';

	interface Props {
		exerciseName: string;
		equipment?: string[];
		notes?: string;
		size?: number;
	}

	let { exerciseName, equipment, notes, size = 16 }: Props = $props();

	let modalOpen = $state(false);
	let activeTab = $state<'instructions' | 'videos'>('videos');
	let videoModalOpen = $state(false);
	let activeVideo = $state<ExerciseVideo | null>(null);

	let description = $state('');
	let descriptionRequested = $state(false);
	let descriptionLoading = $state(false);
	let descriptionError = $state<string | null>(null);

	let videos = $state<ExerciseVideo[]>([]);
	let videosLoading = $state(false);
	let videosError = $state<string | null>(null);
	let videosUnavailableReason = $state<string | null>(null);

	async function handleClick(e: MouseEvent) {
		e.stopPropagation();
		modalOpen = true;
		activeTab = 'videos';

		description = '';
		descriptionRequested = false;
		descriptionError = null;
		descriptionLoading = false;

		videos = [];
		videosError = null;
		videosLoading = false;
		videosUnavailableReason = null;

		const cachedDescriptionTask = getCachedExerciseDescription(getContext())
			.then((cached) => {
				if (cached) {
					description = cached;
					descriptionRequested = true;
				}
			})
			.catch((err) => {
				console.warn('Failed to load cached exercise description:', err);
			});

		const videoTask = loadVideos(false);

		await Promise.allSettled([cachedDescriptionTask, videoTask]);
	}

	function getContext(): ExerciseDescriptionContext {
		return {
			exerciseName,
			equipment,
			notes
		};
	}

	async function loadDescription(forceRefresh = false) {
		if (descriptionLoading) return;

		descriptionRequested = true;
		description = '';
		descriptionError = null;
		descriptionLoading = true;

		try {
			await getExerciseDescription(
				getContext(),
				(chunk) => {
					description += chunk;
				},
				{ forceRefresh }
			);
		} catch (err) {
			descriptionError =
				err instanceof Error ? err.message : 'Failed to load exercise description';
		} finally {
			descriptionLoading = false;
		}
	}

	async function loadVideos(forceRefresh = false) {
		if (videosLoading) return;

		if (!forceRefresh) {
			videos = [];
		}
		videosError = null;
		videosUnavailableReason = null;
		videosLoading = true;

		try {
			const response = await getExerciseVideos(getContext(), { forceRefresh });
			videos = response.videos;
			videosUnavailableReason = response.unavailableReason ?? null;
		} catch (err) {
			videosError = err instanceof Error ? err.message : 'Failed to load exercise videos';
		} finally {
			videosLoading = false;
		}
	}

	function handleClose() {
		modalOpen = false;
	}

	function buildEmbedUrl(videoId: string): string {
		const params = new URLSearchParams({
			autoplay: '1',
			rel: '0',
			modestbranding: '1',
			playsinline: '1'
		});
		return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
	}

	function openVideo(video: ExerciseVideo) {
		activeVideo = video;
		videoModalOpen = true;
	}

	function closeVideoModal() {
		videoModalOpen = false;
		activeVideo = null;
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

<Modal bind:open={modalOpen} title={exerciseName} size="lg" onclose={handleClose}>
	{#snippet children()}
		<div class="mb-4 inline-flex rounded-lg border border-theme surface-elevated p-1">
			<button
				type="button"
				class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors {activeTab === 'videos'
					? 'bg-brand-soft text-brand'
					: 'text-secondary hover:text-primary'}"
				onclick={() => (activeTab = 'videos')}
			>
				Videos
			</button>
			<button
				type="button"
				class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors {activeTab === 'instructions'
					? 'bg-brand-soft text-brand'
					: 'text-secondary hover:text-primary'}"
				onclick={() => (activeTab = 'instructions')}
			>
				Instructions
			</button>
		</div>

		{#if activeTab === 'instructions'}
			{#if descriptionLoading && !description}
				<div class="flex items-center justify-center py-8">
					<LoadingSpinner />
				</div>
			{:else if descriptionError}
				<div class="space-y-3">
					<div class="text-error p-4 bg-error-soft border border-error-soft rounded-lg">
						{descriptionError}
					</div>
					<button
						type="button"
						onclick={() => loadDescription(true)}
						class="px-4 py-2 rounded-lg bg-brand-soft text-brand text-sm font-medium hover:opacity-90 transition-opacity"
					>
						Try again
					</button>
				</div>
			{:else if description}
				<div class="prose prose-sm max-w-none">
					{@html renderMarkdownToHtml(description)}
				</div>
				{#if descriptionLoading}
					<div class="flex items-center gap-2 mt-4 text-secondary text-sm">
						<LoadingSpinner size="sm" />
						<span>Loading...</span>
					</div>
				{/if}
				<div class="mt-4 flex justify-end">
					<button
						type="button"
						onclick={() => loadDescription(true)}
						disabled={descriptionLoading}
						class="px-3 py-1.5 rounded-lg bg-border-soft text-secondary text-xs font-medium hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{descriptionLoading ? 'Regenerating...' : 'Regenerate instructions'}
					</button>
				</div>
			{:else if !descriptionRequested}
				<div class="space-y-3 p-4 rounded-lg bg-border-soft border border-theme">
					<p class="text-sm text-secondary">
						Generate step-by-step instructions when you need them.
					</p>
					<button
						type="button"
						onclick={() => loadDescription(false)}
						class="px-4 py-2 rounded-lg bg-brand-soft text-brand text-sm font-medium hover:opacity-90 transition-opacity"
					>
						Generate instructions
					</button>
				</div>
			{:else}
				<div class="space-y-3 p-4 rounded-lg bg-border-soft border border-theme">
					<p class="text-secondary text-sm">No instructions available.</p>
					<button
						type="button"
						onclick={() => loadDescription(true)}
						class="px-4 py-2 rounded-lg bg-brand-soft text-brand text-sm font-medium hover:opacity-90 transition-opacity"
					>
						Generate again
					</button>
				</div>
			{/if}
		{:else}
			{#if videosLoading && videos.length === 0}
				<div class="flex items-center justify-center py-8">
					<LoadingSpinner />
				</div>
			{:else if videosError}
				<div class="text-error p-4 bg-error-soft border border-error-soft rounded-lg">
					{videosError}
				</div>
			{:else if videos.length > 0}
				<div class="space-y-3">
					{#if videosUnavailableReason}
						<div class="text-sm text-secondary p-3 rounded-lg bg-border-soft border border-theme">
							{videosUnavailableReason}
						</div>
					{/if}
					<div class="grid grid-cols-2 gap-3">
					{#each videos as video, index (video.id)}
						<button
							type="button"
							onclick={() => openVideo(video)}
							class="block rounded-xl border border-theme overflow-hidden surface-elevated hover:border-brand-soft transition-colors"
							aria-label="Play exercise video {index + 1}"
						>
							<div class="relative bg-border-soft">
								{#if video.thumbnailUrl}
									<img
										src={video.thumbnailUrl}
										alt="Exercise video thumbnail {index + 1}"
										class="w-full h-36 sm:h-44 object-cover"
										loading="lazy"
									/>
								{:else}
									<div class="h-36 sm:h-44 flex items-center justify-center text-secondary text-sm">
										No thumbnail available
									</div>
								{/if}
								<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
									<div class="w-10 h-10 rounded-full bg-black/70 text-white flex items-center justify-center">
										<Play size={16} fill="currentColor" />
									</div>
								</div>
							</div>
						</button>
					{/each}
					</div>
				</div>
			{:else}
				<div class="text-secondary p-4 rounded-lg bg-border-soft border border-theme text-sm">
					{videosUnavailableReason || 'No matching YouTube videos found for this exercise.'}
				</div>
			{/if}
			<div class="mt-4 flex justify-end">
				<button
					type="button"
					onclick={() => loadVideos(true)}
					disabled={videosLoading}
					class="px-3 py-1.5 rounded-lg bg-border-soft text-secondary text-xs font-medium hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{videosLoading ? 'Regenerating...' : 'Regenerate videos'}
				</button>
			</div>
		{/if}
	{/snippet}
</Modal>

<Modal
	bind:open={videoModalOpen}
	fullscreen={true}
	flush={true}
	title={exerciseName}
	onclose={closeVideoModal}
>
	{#snippet children()}
		{#if activeVideo}
			<div class="h-full w-full bg-black">
				<iframe
					src={buildEmbedUrl(activeVideo.id)}
					title="Exercise video for {exerciseName}"
					class="h-full w-full"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
					allowfullscreen
				></iframe>
			</div>
		{/if}
	{/snippet}
</Modal>
