<script lang="ts">
	import { tick } from 'svelte';
	import type { Message } from '$lib/types/conversation';
	import Input from '../shared/Input.svelte';
	import Button from '../shared/Button.svelte';
	import Card from '../shared/Card.svelte';
	import { Send, Sparkles } from 'lucide-svelte';
	import { renderMarkdownToHtml } from '$lib/utils/markdown';

	interface Props {
		messages: Message[];
		loading: boolean;
		statusText?: string;
		fillHeight?: boolean;
		onsend: (message: string) => void;
	}

	let {
		messages,
		loading,
		statusText = '',
		fillHeight = false,
		onsend
	}: Props = $props();

	let input = $state('');
	let messagesContainer: HTMLDivElement;
	let shouldAutoScroll = $state(true);

	function isNearBottom(): boolean {
		if (!messagesContainer) return true;
		const distanceFromBottom =
			messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight;
		return distanceFromBottom < 72;
	}

	function handleScroll() {
		shouldAutoScroll = isNearBottom();
	}

	async function scrollToBottom(behavior: ScrollBehavior = 'auto', force = false) {
		await tick();
		if (!messagesContainer) return;
		if (!shouldAutoScroll && !force) return;
		messagesContainer.scrollTo({
			top: messagesContainer.scrollHeight,
			behavior
		});
	}

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
		if (!messagesContainer || messages.length === 0) return;
		const lastMessage = messages[messages.length - 1];
		const content = (lastMessage.displayContent ?? lastMessage.content).length;
		const signature = `${messages.length}:${content}:${loading ? 1 : 0}:${statusText}`;
		if (signature) {
			void scrollToBottom('auto');
		}
	});

	function renderMessage(content: string): string {
		return renderMarkdownToHtml(content.trim());
	}
</script>

<div class="space-y-4 {fillHeight ? 'h-full flex flex-col' : ''}">
	<Card padding="none" className={fillHeight ? 'flex-1 min-h-0 flex flex-col' : ''}>
		<div class="border-b border-theme px-4 py-3 bg-[rgb(var(--color-surface-elevated)/0.45)]">
			<p class="text-xs font-semibold tracking-[0.08em] uppercase text-secondary">
				Program Design Session
			</p>
		</div>
		<div
			bind:this={messagesContainer}
			onscroll={handleScroll}
			class="space-y-4 overflow-y-auto p-4 sm:p-5 scroll-smooth {fillHeight ? 'flex-1 min-h-0' : 'max-h-[56vh] sm:max-h-[62vh]'}"
		>
			{#each messages as message, index}
				{@const rawContent = message.displayContent ?? message.content}
				{#if rawContent.trim().length > 0}
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
							<div class="text-sm leading-relaxed markdown-content">
								{@html renderMessage(rawContent)}
							</div>
						</div>
					</div>
				{/if}
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
						<p class="text-xs text-secondary status-text">{statusText || 'Thinking'}</p>
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

<style>
	@keyframes statusDrift {
		0% {
			opacity: 0.56;
		}
		50% {
			opacity: 0.95;
		}
		100% {
			opacity: 0.56;
		}
	}

	.status-text {
		font-style: italic;
		animation: statusDrift 1.8s ease-in-out infinite;
	}

	.markdown-content :global(p:first-child) {
		margin-top: 0;
	}

	.markdown-content :global(p:last-child) {
		margin-bottom: 0;
	}
</style>
