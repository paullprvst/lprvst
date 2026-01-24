<script lang="ts">
	import Input from '../shared/Input.svelte';
	import Button from '../shared/Button.svelte';
	import Card from '../shared/Card.svelte';

	interface Props {
		onsubmit: (objective: string) => void;
	}

	let { onsubmit }: Props = $props();

	let objective = $state('');

	function handleSubmit() {
		if (objective.trim()) {
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

<Card>
	<div class="space-y-4">
		<div>
			<h2 class="text-2xl font-bold mb-2">Tell me about your fitness goals</h2>
			<p class="text-gray-600">
				Describe what you want to achieve. For example: "I want to build muscle" or "I want to lose weight and improve my endurance"
			</p>
		</div>

		<Input
			bind:value={objective}
			placeholder="e.g., I want to build muscle and get stronger..."
			multiline={true}
			rows={4}
			autofocus={true}
			onkeydown={handleKeydown}
		/>

		<Button onclick={handleSubmit} disabled={!objective.trim()} fullWidth={true}>
			{#snippet children()}
				Start Conversation
			{/snippet}
		</Button>
	</div>
</Card>
