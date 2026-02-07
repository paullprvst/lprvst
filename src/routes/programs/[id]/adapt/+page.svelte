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
	import type { AgentAction } from '$lib/types/agent';
	import type { Conversation } from '$lib/types/conversation';
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

	async function handleAgentAction(action: AgentAction | undefined, conversationId: string): Promise<boolean> {
		if (!action || action.type !== 'modify_program') return false;
		await conversationManager.completeConversation(conversationId);
		goto(`/programs/${action.programId}`);
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
		try {
			conversation = await conversationManager.createConversation(
				'reevaluation',
				initialRequest,
				program.id
			);

			// Get initial AI response
			const turn = await conversationManager.getAssistantResponse(conversation.id);

			// Reload conversation to get updated messages
			const updated = await conversationRepository.get(conversation.id);
			if (updated) {
				conversation = updated;
			}
			if (await handleAgentAction(turn.action, conversation.id)) return;

			step = 'conversation';
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
		} finally {
			messageLoading = false;
		}
	}

	async function handleMessageSend(message: string) {
		if (!conversation) return;

		messageLoading = true;
		errorMessage = '';
		try {
			await conversationManager.addUserMessage(conversation.id, message);
			const turn = await conversationManager.getAssistantResponse(conversation.id);

			// Reload conversation
			const updated = await conversationRepository.get(conversation.id);
			if (updated) {
				conversation = updated;
			}
			if (await handleAgentAction(turn.action, conversation.id)) return;
		} catch (error) {
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
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey && initialRequest.trim()) {
			e.preventDefault();
			handleRequestSubmit();
		}
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
				<div class="w-16 h-16 mx-auto rounded-2xl bg-orange-500/10 flex items-center justify-center">
					<Key size={32} class="text-orange-500" />
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
	<div class="max-w-3xl mx-auto space-y-4">
		{#if errorMessage}
			<AlertBanner variant="error" title="Request failed" message={errorMessage} />
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
				</div>
			</Card>
		{:else if step === 'conversation' && conversation}
			<AIConversation
				messages={conversation.messages}
				loading={messageLoading}
				onsend={handleMessageSend}
			/>
		{/if}
	</div>
{/if}
