<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { conversationManager } from '$lib/services/ai/conversation-manager';
	import { conversationRepository } from '$lib/services/storage/conversation-repository';
	import { programGenerator } from '$lib/services/ai/program-generator';
	import { userRepository } from '$lib/services/storage/user-repository';
	import { checkApiKeyStatus } from '$lib/services/ai/api-client';
	import { getAuthState } from '$lib/stores/auth-store.svelte';
	import ObjectiveInput from '$lib/components/onboarding/ObjectiveInput.svelte';
	import AIConversation from '$lib/components/onboarding/AIConversation.svelte';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';
	import Card from '$lib/components/shared/Card.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import { Key } from 'lucide-svelte';
	import type { Conversation } from '$lib/types/conversation';

	const auth = getAuthState();
	let step = $state<'api-key-required' | 'loading' | 'input' | 'conversation' | 'generating'>('loading');
	let conversation = $state<Conversation | null>(null);
	let loading = $state(false);
	let readyToGenerate = $state(false);
	let initialObjective = $state('');

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
			if (!hasApiKey) {
				step = 'api-key-required';
			} else {
				step = 'input';
			}
		};
		checkWhenReady();
	});

	async function handleObjectiveSubmit(objective: string) {
		loading = true;
		initialObjective = objective;
		try {
			conversation = await conversationManager.createConversation('onboarding', objective);

			// Get initial AI response
			await conversationManager.getAssistantResponse(conversation.id);

			// Reload conversation to get updated messages
			const updated = await conversationRepository.get(conversation.id);
			if (updated) {
				conversation = updated;
			}

			step = 'conversation';
		} catch (error) {
			console.error('Error starting conversation:', error);
			const err = error as { status?: number; error?: { type?: string } };
			if (err.status === 529 || err.error?.type === 'overloaded_error') {
				alert('The AI service is currently overloaded. Please try again in a moment.');
			} else if (error instanceof Error && error.message.includes('API key')) {
				step = 'api-key-required';
			} else {
				const message = error instanceof Error ? error.message : 'Unknown error';
				alert(`Failed to start conversation: ${message}`);
			}
		} finally {
			loading = false;
		}
	}

	async function handleMessageSend(message: string) {
		if (!conversation) return;

		loading = true;
		try {
			await conversationManager.addUserMessage(conversation.id, message);
			await conversationManager.getAssistantResponse(conversation.id);

			// Reload conversation
			const updated = await conversationRepository.get(conversation.id);
			if (updated) {
				conversation = updated;
			}

			// Check if ready to generate
			readyToGenerate = await conversationManager.isReadyToGenerate(conversation.id);
		} catch (error) {
			console.error('Error sending message:', error);
			const err = error as { status?: number; error?: { type?: string } };
			if (err.status === 529 || err.error?.type === 'overloaded_error') {
				alert('The AI service is currently overloaded. Please try again in a moment.');
			} else if (error instanceof Error && error.message.includes('API key')) {
				step = 'api-key-required';
			} else {
				const message = error instanceof Error ? error.message : 'Unknown error';
				alert(`Failed to send message: ${message}`);
			}
		} finally {
			loading = false;
		}
	}

	async function handleGenerate() {
		if (!conversation) return;

		step = 'generating';
		try {
			// Update user profile with objectives to mark onboarding complete
			const currentUser = await userRepository.getCurrentUser();
			if (currentUser) {
				await userRepository.update(currentUser.id, {
					objectives: initialObjective
				});
			}

			const program = await programGenerator.generateFromConversation(conversation.id);
			await conversationManager.completeConversation(conversation.id);
			goto(`/programs/${program.id}`);
		} catch (error) {
			console.error('Error generating program:', error);
			const err = error as { status?: number; error?: { type?: string } };
			if (err.status === 529 || err.error?.type === 'overloaded_error') {
				alert('The AI service is currently overloaded. Please try again in a moment.');
			} else if (error instanceof Error && error.message.includes('API key')) {
				step = 'api-key-required';
			} else {
				const message = error instanceof Error ? error.message : 'Unknown error';
				alert(`Failed to generate program: ${message}`);
			}
			step = 'conversation';
		}
	}
</script>

<div class="max-w-3xl mx-auto">
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
		<AIConversation
			messages={conversation.messages}
			{loading}
			{readyToGenerate}
			onsend={handleMessageSend}
			ongenerate={handleGenerate}
		/>
	{:else if step === 'generating'}
		<div class="text-center py-12">
			<LoadingSpinner size="lg" />
			<p class="mt-4 text-lg text-secondary">Generating your personalized workout program...</p>
			<p class="mt-2 text-sm text-muted">This may take a moment</p>
		</div>
	{/if}
</div>
