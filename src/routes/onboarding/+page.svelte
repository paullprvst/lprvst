<script lang="ts">
	import { goto } from '$app/navigation';
	import { conversationManager } from '$lib/services/ai/conversation-manager';
	import { conversationRepository } from '$lib/services/storage/conversation-repository';
	import { programGenerator } from '$lib/services/ai/program-generator';
	import ObjectiveInput from '$lib/components/onboarding/ObjectiveInput.svelte';
	import AIConversation from '$lib/components/onboarding/AIConversation.svelte';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';
	import type { Conversation } from '$lib/types/conversation';

	let step = $state<'input' | 'conversation' | 'generating'>('input');
	let conversation = $state<Conversation | null>(null);
	let loading = $state(false);
	let readyToGenerate = $state(false);

	async function handleObjectiveSubmit(objective: string) {
		loading = true;
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
			} else if (err.status === 401 || (error instanceof Error && error.message.includes('API key'))) {
				alert('Failed to start conversation. Please check your API key in Settings.');
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
			const program = await programGenerator.generateFromConversation(conversation.id);
			await conversationManager.completeConversation(conversation.id);
			goto(`/programs/${program.id}`);
		} catch (error) {
			console.error('Error generating program:', error);
			const err = error as { status?: number; error?: { type?: string } };
			if (err.status === 529 || err.error?.type === 'overloaded_error') {
				alert('The AI service is currently overloaded. Please try again in a moment.');
			} else {
				const message = error instanceof Error ? error.message : 'Unknown error';
				alert(`Failed to generate program: ${message}`);
			}
			step = 'conversation';
		}
	}
</script>

<div class="max-w-3xl mx-auto">
	{#if step === 'input'}
		<ObjectiveInput onsubmit={handleObjectiveSubmit} />
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
			<p class="mt-4 text-lg text-gray-600">Generating your personalized workout program...</p>
			<p class="mt-2 text-sm text-gray-500">This may take a moment</p>
		</div>
	{/if}
</div>
