<svelte:head>
	<title>Adapt {program?.name ?? 'Program'} | AI Fitness Coach</title>
</svelte:head>

<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { conversationManager } from '$lib/services/ai/conversation-manager';
	import { conversationRepository } from '$lib/services/storage/conversation-repository';
	import { programRepository } from '$lib/services/storage/program-repository';
	import { checkApiKeyStatus } from '$lib/services/ai/api-client';
	import { getAuthState } from '$lib/stores/auth-store.svelte';
	import type { Program } from '$lib/types/program';
	import type { AgentAction, AgentTurnResponse } from '$lib/types/agent';
	import type { Conversation, Message } from '$lib/types/conversation';
	import AIConversation from '$lib/components/onboarding/AIConversation.svelte';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';
	import Card from '$lib/components/shared/Card.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import Input from '$lib/components/shared/Input.svelte';
	import AlertBanner from '$lib/components/shared/AlertBanner.svelte';
	import { ArrowLeft, Send, Key } from 'lucide-svelte';

	const auth = getAuthState();
	let program = $state<Program | null>(null);
	let conversation = $state<Conversation | null>(null);
	let step = $state<'api-key-required' | 'input' | 'conversation'>('input');
	let loading = $state(true);
	let messageLoading = $state(false);
	let initialRequest = $state('');
	let errorMessage = $state('');
	let statusText = $state('');
	let provisionalMessages = $state<Message[]>([]);
	let updatedProgramId = $state<string | null>(null);

	async function handleAgentAction(action: AgentAction | undefined, conversationId: string): Promise<boolean> {
		if (!action || action.type !== 'modify_program') return false;
		await conversationManager.completeConversation(conversationId);
		updatedProgramId = action.programId;
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
				loading = false;
				return;
			}
			const hasApiKey = await checkApiKeyStatus();
			if (!hasApiKey) {
				step = 'api-key-required';
				loading = false;
				return;
			}

			const id = $page.params.id;
			if (id) {
				program = await programRepository.get(id) || null;
			}
			loading = false;
		};
		checkWhenReady();
	});

	async function handleRequestSubmit() {
		if (!program || !initialRequest.trim()) return;

		messageLoading = true;
		errorMessage = '';
		statusText = 'Starting';
		updatedProgramId = null;
		try {
			const prompt = initialRequest.trim();
			initialRequest = '';
			provisionalMessages = [{ role: 'user', content: prompt, timestamp: new Date() }];
			step = 'conversation';

			const createdConversation = await conversationManager.createConversation(
				'reevaluation',
				prompt,
				program.id
			);
			conversation = createdConversation;
			provisionalMessages = [];

			const assistantPlaceholderIndex = appendMessage({
				role: 'assistant',
				content: '',
				timestamp: new Date()
			});

			const turn = await streamAssistantResponse(createdConversation.id, assistantPlaceholderIndex);
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
			messageLoading = false;
			statusText = '';
		}
	}

	async function handleMessageSend(message: string) {
		const activeConversation = conversation;
		if (!activeConversation) return;

		messageLoading = true;
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
			const turn = await streamAssistantResponse(activeConversation.id, assistantPlaceholderIndex);
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
				const message = error instanceof Error ? error.message : 'Unknown error';
				errorMessage = `Failed to send message: ${message}`;
			}
		} finally {
			messageLoading = false;
			statusText = '';
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && initialRequest.trim()) {
			e.preventDefault();
			handleRequestSubmit();
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

{#if loading}
	<div class="flex justify-center py-12">
		<LoadingSpinner size="lg" />
	</div>
{:else if step === 'api-key-required'}
	<div class="max-w-3xl mx-auto">
		<Card>
			<div class="text-center space-y-4 py-4">
				<div class="w-16 h-16 mx-auto rounded-2xl bg-warning-soft flex items-center justify-center">
					<Key size={32} class="text-warning" />
				</div>
				<h2 class="text-xl font-semibold text-primary">API Key Required</h2>
				<p class="text-secondary max-w-md mx-auto">
					To modify your workout program, you need to add your Anthropic API key first.
				</p>
				<Button onclick={() => goto('/settings')} fullWidth>
					{#snippet children()}
						Go to Settings
					{/snippet}
				</Button>
			</div>
		</Card>
	</div>
{:else if !program}
	<Card>
		<div class="text-center py-12">
			<p class="text-secondary">Program not found</p>
			<Button onclick={() => goto('/')}>
				{#snippet children()}
					Go Home
				{/snippet}
			</Button>
		</div>
	</Card>
{:else}
	<div class="max-w-4xl mx-auto space-y-4 min-h-[calc(100svh-11.5rem)] h-full flex flex-col">
		{#if errorMessage}
			<AlertBanner variant="error" title="Request failed" message={errorMessage} />
		{/if}

		{#if updatedProgramId}
			<Card>
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h3 class="text-base font-semibold text-primary">Program updated</h3>
						<p class="text-sm text-secondary">Review the final assistant message, then open your updated program.</p>
					</div>
					<Button onclick={() => goto(`/programs/${updatedProgramId}`)}>
						{#snippet children()}
							Open Program
						{/snippet}
					</Button>
				</div>
			</Card>
		{/if}

		<div class="flex items-center gap-4">
			<button
				onclick={() => goto(`/programs/${program!.id}`)}
				class="text-secondary hover:text-primary touch-target"
			>
				<ArrowLeft size={24} />
			</button>
			<h1 class="text-xl font-bold text-primary">Chat: {program.name}</h1>
		</div>

		{#if step === 'input'}
			<Card>
				<div class="space-y-4">
					<p class="text-secondary">
						Ask questions or request modifications to your program. For example:
					</p>
					<ul class="text-sm text-muted space-y-1 ml-4">
						<li>- "Why did you choose these exercises?"</li>
						<li>- "Is this program good for building strength?"</li>
						<li>- "I injured my shoulder, need to avoid overhead movements"</li>
						<li>- "Add more upper body exercises"</li>
						<li>- "I got a barbell, can we add compound lifts?"</li>
					</ul>

					<div class="flex gap-2">
						<div class="flex-1">
							<Input
								bind:value={initialRequest}
								placeholder="Ask a question or request a modification..."
								multiline={true}
								rows={3}
								disabled={messageLoading}
								onkeydown={handleKeydown}
							/>
						</div>
						<Button onclick={handleRequestSubmit} disabled={!initialRequest.trim() || messageLoading} loading={messageLoading}>
							{#snippet children()}
								<Send size={20} />
							{/snippet}
						</Button>
					</div>
					<p class="text-xs text-muted">Press Cmd/Ctrl+Enter to send. Enter adds a new line.</p>
				</div>
			</Card>
		{:else if step === 'conversation' && (conversation || provisionalMessages.length > 0)}
			<div class="flex-1 min-h-0">
				<AIConversation
					messages={conversation?.messages ?? provisionalMessages}
					loading={messageLoading}
					{statusText}
					fillHeight={true}
					onsend={handleMessageSend}
				/>
			</div>
		{/if}
	</div>
{/if}
