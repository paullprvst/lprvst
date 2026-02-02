<script lang="ts">
	import type { Message } from '$lib/types/conversation';
	import Input from '../shared/Input.svelte';
	import Button from '../shared/Button.svelte';
	import Card from '../shared/Card.svelte';
	import { Send, Sparkles } from 'lucide-svelte';

	interface Props {
		messages: Message[];
		loading: boolean;
		readyToGenerate: boolean;
		onsend: (message: string) => void;
		ongenerate: () => void;
		generateButtonText?: string;
	}

	let {
		messages,
		loading,
		readyToGenerate,
		onsend,
		ongenerate,
		generateButtonText = 'Generate My Program'
	}: Props = $props();

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
				messagesContainer.scrollTo({
					top: messagesContainer.scrollHeight,
					behavior: 'smooth'
				});
			}, 100);
		}
	});

	function cleanMessageContent(content: string): string {
		// Remove system tags from displayed messages
		return content.replace(/READY_TO_GENERATE/g, '').replace(/READY_TO_MODIFY/g, '').trim();
	}
</script>

<div class="space-y-4">
	<Card padding="none">
		<div
			bind:this={messagesContainer}
			class="space-y-4 max-h-[60vh] overflow-y-auto p-4 scroll-smooth"
		>
			{#each messages as message, index}
				<div
					class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'} animate-slideUp"
					style="animation-delay: {index * 50}ms"
				>
					{#if message.role === 'assistant'}
						<!-- AI Avatar -->
						<div class="flex-shrink-0 mr-3">
							<div
								class="w-8 h-8 rounded-full bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-primary-hover))] flex items-center justify-center"
							>
								<Sparkles size={16} class="text-white" />
							</div>
						</div>
					{/if}

					<div
						class="max-w-[80%] rounded-2xl px-4 py-3 {message.role === 'user'
							? 'bg-[rgb(var(--color-primary))] text-white rounded-br-md'
							: 'surface-elevated border border-theme rounded-bl-md'}"
					>
						<p class="whitespace-pre-wrap text-sm leading-relaxed">
							{cleanMessageContent(message.displayContent ?? message.content)}
						</p>
					</div>
				</div>
			{/each}

			<!-- Typing Indicator -->
			{#if loading}
				<div class="flex justify-start animate-fadeIn">
					<div class="flex-shrink-0 mr-3">
						<div
							class="w-8 h-8 rounded-full bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-primary-hover))] flex items-center justify-center"
						>
							<Sparkles size={16} class="text-white" />
						</div>
					</div>
					<div class="surface-elevated border border-theme rounded-2xl rounded-bl-md px-4 py-3">
						<div class="flex gap-1.5 items-center h-5">
							<div
								class="w-2 h-2 rounded-full bg-[rgb(var(--color-text-muted))]"
								style="animation: typingDot 1.4s ease-in-out infinite; animation-delay: 0ms;"
							></div>
							<div
								class="w-2 h-2 rounded-full bg-[rgb(var(--color-text-muted))]"
								style="animation: typingDot 1.4s ease-in-out infinite; animation-delay: 200ms;"
							></div>
							<div
								class="w-2 h-2 rounded-full bg-[rgb(var(--color-text-muted))]"
								style="animation: typingDot 1.4s ease-in-out infinite; animation-delay: 400ms;"
							></div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</Card>

	<div class="space-y-3">
		{#if readyToGenerate}
			<div class="animate-slideUp">
				<Button onclick={ongenerate} fullWidth={true} size="lg">
					{#snippet children()}
						<Sparkles size={20} />
						{generateButtonText}
					{/snippet}
				</Button>
			</div>
		{/if}

		<div class="flex gap-3 animate-slideUp">
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
	</div>
</div>
