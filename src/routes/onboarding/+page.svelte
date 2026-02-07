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
	import { Key } from 'lucide-svelte';
	import type { AgentAction } from '$lib/types/agent';
	import type { Conversation } from '$lib/types/conversation';

	const auth = getAuthState();
	let step = $state<'api-key-required' | 'loading' | 'input' | 'conversation'>('loading');
	let conversation = $state<Conversation | null>(null);
	let loading = $state(false);
	let initialObjective = $state('');
	let errorMessage = $state('');

	async function handleAgentAction(action: AgentAction | undefined, conversationId: string): Promise<boolean> {
		if (!action || action.type !== 'create_program') return false;

		const currentUser = await userRepository.getCurrentUser();
		if (currentUser && initialObjective) {
			await userRepository.update(currentUser.id, {
				objectives: initialObjective
			});
		}

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
		initialObjective = objective;

		try {
			conversation = await conversationManager.createConversation('onboarding', objective);
			const turn = await conversationManager.getAssistantResponse(conversation.id);
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
			loading = false;
		}
	}

	async function handleMessageSend(message: string) {
		if (!conversation) return;

		loading = true;
		errorMessage = '';

		try {
			await conversationManager.addUserMessage(conversation.id, message);
			const turn = await conversationManager.getAssistantResponse(conversation.id);
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
				const detailed = error instanceof Error ? error.message : 'Unknown error';
				errorMessage = `Failed to send message: ${detailed}`;
			}
		} finally {
			loading = false;
		}
	}
</script>

<div class="max-w-3xl mx-auto">
	{#if errorMessage && step !== 'loading'}
		<div class="mb-4">
			<AlertBanner variant="error" title="Request failed" message={errorMessage} />
		</div>
	{/if}

	{#if step === 'loading'}
		<div class="flex justify-center py-12">
			<LoadingSpinner size="lg" />
		</div>
	{:else if step === 'api-key-required'}
		<Card>
			<div class="text-center space-y-4 py-4">
				<div class="w-16 h-16 mx-auto rounded-2xl bg-orange-500/10 flex items-center justify-center">
					<Key size={32} class="text-orange-500" />
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
	{:else if step === 'conversation' && conversation}
		<AIConversation messages={conversation.messages} {loading} onsend={handleMessageSend} />
	{/if}
</div>
