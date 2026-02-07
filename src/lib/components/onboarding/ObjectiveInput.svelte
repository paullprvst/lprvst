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
			<div class="text-center space-y-4">
				<div
					class="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[rgb(var(--color-primary))] via-[rgb(var(--color-primary-hover))] to-[rgb(var(--color-accent-secondary))] flex items-center justify-center shadow-[0_18px_38px_-20px_rgb(var(--color-primary)/0.9)]"
				>
					<Target size={30} class="text-[rgb(4_15_24)]" />
				</div>
				<div>
					<h2 class="text-3xl font-bold text-primary">Define Your Target</h2>
					<p class="text-secondary mt-2 max-w-xl mx-auto">
						Describe what you want to achieve. I will shape your first program around your goal,
						time constraints, and training style.
					</p>
				</div>
			</div>

			<!-- Input area -->
			<div class="space-y-4">
				<Input
					bind:value={objective}
					placeholder="e.g. Build lean muscle while improving shoulder stability in 4 sessions/week"
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
				<p class="text-xs text-muted text-center tracking-[0.06em] uppercase">Quick starters</p>
				<div class="flex flex-wrap gap-2 justify-center">
					{#each ['Build muscle', 'Lose weight', 'Get stronger', 'Improve endurance'] as suggestion}
						<button
							onclick={() => (objective = suggestion)}
							disabled={loading}
							class="px-3.5 py-1.5 text-sm rounded-full border border-theme bg-[rgb(var(--color-surface-elevated)/0.45)] text-secondary hover:text-primary hover:border-[rgb(var(--color-primary)/0.7)] hover:bg-[rgb(var(--color-primary)/0.12)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{suggestion}
						</button>
					{/each}
				</div>
			</div>
		</div>
	</Card>
</div>
