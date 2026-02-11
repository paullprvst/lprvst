<svelte:head>
	<title>New Program | AI Fitness Coach</title>
</svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { conversationManager } from '$lib/services/ai/conversation-manager';
	import { conversationRepository } from '$lib/services/storage/conversation-repository';
	import { userRepository } from '$lib/services/storage/user-repository';
	import { checkApiKeyStatus } from '$lib/services/ai/api-client';
	import { getAuthState } from '$lib/stores/auth-store.svelte';
	import ObjectiveInput from '$lib/components/onboarding/ObjectiveInput.svelte';
	import AIConversation from '$lib/components/onboarding/AIConversation.svelte';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';
	import Card from '$lib/components/shared/Card.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import AlertBanner from '$lib/components/shared/AlertBanner.svelte';
	import { Key, Sparkles } from 'lucide-svelte';
	import type { AgentAction, AgentTurnResponse } from '$lib/types/agent';
	import type { Conversation, Message } from '$lib/types/conversation';

	const auth = getAuthState();
	let step = $state<'api-key-required' | 'loading' | 'input' | 'conversation'>('loading');
	let conversation = $state<Conversation | null>(null);
	let loading = $state(false);
	let initialObjective = $state('');
	let errorMessage = $state('');
	let statusText = $state('');
	let provisionalMessages = $state<Message[]>([]);
	let createdProgramId = $state<string | null>(null);

	async function handleAgentAction(action: AgentAction | undefined, conversationId: string): Promise<boolean> {
		if (!action || action.type !== 'create_program') return false;

		const currentUser = await userRepository.getCurrentUser();
		if (currentUser && initialObjective) {
			await userRepository.update(currentUser.id, {
				objectives: initialObjective
			});
		}

		await conversationManager.completeConversation(conversationId);
		createdProgramId = action.programId;
		return true;
	}

	onMount(() => {
		const checkWhenReady = async () => {
			if (!auth.initialized) {
				setTimeout(checkWhenReady, 50);
				return;
			}
			if (!auth.isAuthenticated) {
				step = 'api-key-required';
				return;
			}
			const hasApiKey = await checkApiKeyStatus();
			step = hasApiKey ? 'input' : 'api-key-required';
		};
		checkWhenReady();
	});

	async function handleObjectiveSubmit(objective: string) {
		loading = true;
		errorMessage = '';
		statusText = 'Starting';
		initialObjective = objective;
		createdProgramId = null;

		try {
			provisionalMessages = [{ role: 'user', content: objective, timestamp: new Date() }];
			step = 'conversation';

			const createdConversation = await conversationManager.createConversation('onboarding', objective);
			conversation = createdConversation;
			provisionalMessages = [];
			const assistantPlaceholderIndex = appendMessage({
				role: 'assistant',
				content: '',
				timestamp: new Date()
			});
			const turn = await streamAssistantResponse(
				createdConversation.id,
				assistantPlaceholderIndex
			);

			if (await handleAgentAction(turn.action, createdConversation.id)) return;
		} catch (error) {
			console.error('Error starting conversation:', error);
			const err = error as { status?: number; error?: { type?: string } };
			if (err.status === 529 || err.error?.type === 'overloaded_error') {
				errorMessage = 'The AI service is currently overloaded. Please try again in a moment.';
			} else if (error instanceof Error && error.message.includes('API key')) {
				step = 'api-key-required';
			} else {
				const message = error instanceof Error ? error.message : 'Unknown error';
				errorMessage = `Failed to start conversation: ${message}`;
			}
			provisionalMessages = [];
			if (!conversation) {
				step = 'input';
			}
		} finally {
			loading = false;
			statusText = '';
		}
	}

	async function handleMessageSend(message: string) {
		const activeConversation = conversation;
		if (!activeConversation) return;

		loading = true;
		errorMessage = '';
		statusText = 'Sending';
		const previousMessages = [...activeConversation.messages];

		appendMessage({
			role: 'user',
			content: message,
			timestamp: new Date()
		});
		const assistantPlaceholderIndex = appendMessage({
			role: 'assistant',
			content: '',
			timestamp: new Date()
		});

		try {
			await conversationManager.addUserMessage(activeConversation.id, message);
			const turn = await streamAssistantResponse(
				activeConversation.id,
				assistantPlaceholderIndex
			);
			if (await handleAgentAction(turn.action, activeConversation.id)) return;
		} catch (error) {
			if (conversation) {
				conversation = {
					...conversation,
					messages: previousMessages,
					updatedAt: new Date()
				};
			}
			console.error('Error sending message:', error);
			const err = error as { status?: number; error?: { type?: string } };
			if (err.status === 529 || err.error?.type === 'overloaded_error') {
				errorMessage = 'The AI service is currently overloaded. Please try again in a moment.';
			} else if (error instanceof Error && error.message.includes('API key')) {
				step = 'api-key-required';
			} else {
				const detailed = error instanceof Error ? error.message : 'Unknown error';
				errorMessage = `Failed to send message: ${detailed}`;
			}
		} finally {
			loading = false;
			statusText = '';
		}
	}

	function appendMessage(message: Message): number {
		if (!conversation) return -1;
		const nextMessages = [...conversation.messages, message];
		conversation = {
			...conversation,
			messages: nextMessages,
			updatedAt: new Date()
		};
		return nextMessages.length - 1;
	}

	function updateMessageContent(index: number, content: string): void {
		if (!conversation || index < 0 || index >= conversation.messages.length) return;
		const nextMessages = [...conversation.messages];
		const existing = nextMessages[index];
		if (!existing) return;
		nextMessages[index] = {
			...existing,
			content,
			displayContent: undefined
		};
		conversation = {
			...conversation,
			messages: nextMessages,
			updatedAt: new Date()
		};
	}

	async function streamAssistantResponse(
		conversationId: string,
		assistantMessageIndex: number
	): Promise<AgentTurnResponse> {
		let streamedText = '';
		const turn = await conversationManager.getAssistantResponse(conversationId, {
			stream: true,
			onStatus: (stepName) => {
				statusText = stepName;
			},
			onChunk: (chunk) => {
				streamedText += chunk;
				updateMessageContent(assistantMessageIndex, streamedText);
			}
		});

		updateMessageContent(assistantMessageIndex, turn.text || streamedText);
		const updated = await conversationRepository.get(conversationId);
		if (updated) {
			conversation = updated;
		}
		provisionalMessages = [];
		return turn;
	}
</script>

<div class="max-w-3xl mx-auto space-y-4 animate-slideUp">
	{#if step !== 'loading'}
		<div class="flex items-center justify-center">
			<div
				class="inline-flex items-center gap-2 rounded-full border border-brand-soft bg-brand-soft px-4 py-1.5 text-xs font-semibold tracking-[0.08em] text-brand uppercase"
			>
				<Sparkles size={13} />
				Program Generator
			</div>
		</div>
	{/if}

	{#if errorMessage && step !== 'loading'}
		<div class="mb-4">
			<AlertBanner variant="error" title="Request failed" message={errorMessage} />
		</div>
	{/if}

	{#if createdProgramId && step !== 'loading'}
		<Card>
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h3 class="text-base font-semibold text-primary">Program created</h3>
					<p class="text-sm text-secondary">Your plan is ready. Review the assistant message, then open the program.</p>
				</div>
				<Button onclick={() => goto(`/programs/${createdProgramId}`)}>
					{#snippet children()}
						Open Program
					{/snippet}
				</Button>
			</div>
		</Card>
	{/if}

	{#if step === 'loading'}
		<div class="flex justify-center py-12">
			<LoadingSpinner size="lg" />
		</div>
	{:else if step === 'api-key-required'}
		<Card>
			<div class="text-center space-y-4 py-4">
				<div class="w-16 h-16 mx-auto rounded-2xl bg-warning-soft flex items-center justify-center">
					<Key size={32} class="text-warning" />
				</div>
				<h2 class="text-xl font-semibold text-primary">API Key Required</h2>
				<p class="text-secondary max-w-md mx-auto">
					To generate your personalized workout program, you need to add your Anthropic API key first.
				</p>
				<Button onclick={() => goto('/settings')} fullWidth>
					{#snippet children()}
						Go to Settings
					{/snippet}
				</Button>
			</div>
		</Card>
	{:else if step === 'input'}
		<ObjectiveInput onsubmit={handleObjectiveSubmit} {loading} />
	{:else if step === 'conversation' && (conversation || provisionalMessages.length > 0)}
		<AIConversation
			messages={conversation?.messages ?? provisionalMessages}
			{loading}
			{statusText}
			onsend={handleMessageSend}
		/>
	{/if}
</div>
