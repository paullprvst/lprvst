<script lang="ts">
	import Input from '../shared/Input.svelte';
	import Button from '../shared/Button.svelte';
	import Card from '../shared/Card.svelte';
	import { Target } from 'lucide-svelte';

	interface Props {
		onsubmit: (objective: string) => void;
		loading?: boolean;
	}

	let { onsubmit, loading = false }: Props = $props();

	let objective = $state('');

	function handleSubmit() {
		if (objective.trim() && !loading) {
			onsubmit(objective.trim());
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	}
</script>

<div class="animate-slideUp">
	<Card>
		<div class="space-y-6">
			<!-- Header with icon -->
			<div class="text-center space-y-3">
				<div
					class="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-primary-hover))] flex items-center justify-center shadow-lg"
				>
					<Target size={32} class="text-white" />
				</div>
				<div>
					<h2 class="text-2xl font-bold text-primary">Tell me about your fitness goals</h2>
					<p class="text-secondary mt-2">
						Describe what you want to achieve. For example: "I want to build muscle" or "I want to
						lose weight and improve my endurance"
					</p>
				</div>
			</div>

			<!-- Input area -->
			<div class="space-y-4">
				<Input
					bind:value={objective}
					placeholder="e.g., I want to build muscle and get stronger..."
					multiline={true}
					rows={4}
					autofocus={true}
					onkeydown={handleKeydown}
					disabled={loading}
				/>

				<Button onclick={handleSubmit} disabled={!objective.trim() || loading} fullWidth={true} size="lg" {loading}>
					{#snippet children()}
						Start Conversation
					{/snippet}
				</Button>
			</div>

			<!-- Suggestion chips -->
			<div class="space-y-2">
				<p class="text-xs text-muted text-center">Popular goals:</p>
				<div class="flex flex-wrap gap-2 justify-center">
					{#each ['Build muscle', 'Lose weight', 'Get stronger', 'Improve endurance'] as suggestion}
						<button
							onclick={() => (objective = suggestion)}
							disabled={loading}
							class="px-3 py-1.5 text-sm rounded-full border border-theme text-secondary hover:text-primary hover:border-[rgb(var(--color-primary))] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{suggestion}
						</button>
					{/each}
				</div>
			</div>
		</div>
	</Card>
</div>
