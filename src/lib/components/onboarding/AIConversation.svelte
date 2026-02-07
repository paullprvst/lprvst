<script lang="ts">
	import type { Message } from '$lib/types/conversation';
	import Input from '../shared/Input.svelte';
	import Button from '../shared/Button.svelte';
	import Card from '../shared/Card.svelte';
	import { Send, Sparkles } from 'lucide-svelte';

	interface Props {
		messages: Message[];
		loading: boolean;
		onsend: (message: string) => void;
	}

	let {
		messages,
		loading,
		onsend
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
		return content.trim();
	}
</script>

<div class="space-y-4">
	<Card padding="none">
		<div class="border-b border-theme px-4 py-3 bg-[rgb(var(--color-surface-elevated)/0.45)]">
			<p class="text-xs font-semibold tracking-[0.08em] uppercase text-secondary">
				Program Design Session
			</p>
		</div>
		<div
			bind:this={messagesContainer}
			class="space-y-4 max-h-[56vh] sm:max-h-[62vh] overflow-y-auto p-4 sm:p-5 scroll-smooth"
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
						class="max-w-[86%] sm:max-w-[78%] rounded-2xl px-4 py-3 {message.role === 'user'
							? 'bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-primary-hover))] text-[rgb(4_15_24)] rounded-br-md shadow-[0_16px_26px_-20px_rgb(var(--color-primary)/0.85)]'
							: 'surface-elevated border border-theme rounded-bl-md shadow-[0_14px_24px_-22px_rgb(0_0_0/0.9)]'}"
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
		<div
			class="flex gap-3 animate-slideUp p-3 surface-elevated border border-theme rounded-2xl shadow-[0_20px_32px_-28px_rgb(2_7_14/0.9)]"
		>
			<div class="flex-1">
				<Input
					bind:value={input}
					placeholder="Add details about goals, equipment, injuries, or schedule..."
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
