<script lang="ts">
	import { onMount } from 'svelte';
	import type { Message } from '$lib/types/conversation';
	import Input from '../shared/Input.svelte';
	import Button from '../shared/Button.svelte';
	import Card from '../shared/Card.svelte';
	import LoadingSpinner from '../shared/LoadingSpinner.svelte';
	import { Send } from 'lucide-svelte';

	interface Props {
		messages: Message[];
		loading: boolean;
		readyToGenerate: boolean;
		onsend: (message: string) => void;
		ongenerate: () => void;
	}

	let { messages, loading, readyToGenerate, onsend, ongenerate }: Props = $props();

	let input = $state('');
	let messagesContainer: HTMLDivElement;

	function handleSend() {
		if (input.trim() && !loading) {
			onsend(input.trim());
			input = '';
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	$effect(() => {
		// Scroll to bottom when new messages arrive
		if (messagesContainer && messages.length > 0) {
			setTimeout(() => {
				messagesContainer.scrollTop = messagesContainer.scrollHeight;
			}, 100);
		}
	});
</script>

<div class="space-y-4">
	<Card>
		<div
			bind:this={messagesContainer}
			class="space-y-4 max-h-[60vh] overflow-y-auto pr-2"
		>
			{#each messages as message}
				<div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
					<div
						class="max-w-[80%] rounded-lg px-4 py-3 {message.role === 'user'
							? 'bg-blue-600 text-white'
							: 'bg-gray-100 text-gray-900'}"
					>
						<p class="whitespace-pre-wrap">{message.content}</p>
					</div>
				</div>
			{/each}

			{#if loading}
				<div class="flex justify-start">
					<div class="bg-gray-100 rounded-lg px-4 py-3">
						<LoadingSpinner size="sm" />
					</div>
				</div>
			{/if}
		</div>
	</Card>

	{#if readyToGenerate}
		<Button onclick={ongenerate} fullWidth={true} size="lg">
			{#snippet children()}
				Generate My Program
			{/snippet}
		</Button>
	{:else}
		<div class="flex gap-2">
			<div class="flex-1">
				<Input
					bind:value={input}
					placeholder="Type your response..."
					disabled={loading}
					onkeydown={handleKeydown}
				/>
			</div>
			<Button onclick={handleSend} disabled={!input.trim() || loading}>
				{#snippet children()}
					<Send size={20} />
				{/snippet}
			</Button>
		</div>
	{/if}
</div>
