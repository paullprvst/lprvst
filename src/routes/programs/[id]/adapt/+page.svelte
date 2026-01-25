<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { conversationManager } from '$lib/services/ai/conversation-manager';
	import { conversationRepository } from '$lib/services/storage/conversation-repository';
	import { programRepository } from '$lib/services/storage/program-repository';
	import { programGenerator } from '$lib/services/ai/program-generator';
	import type { Program } from '$lib/types/program';
	import type { Conversation } from '$lib/types/conversation';
	import AIConversation from '$lib/components/onboarding/AIConversation.svelte';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';
	import Card from '$lib/components/shared/Card.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import Input from '$lib/components/shared/Input.svelte';
	import { ArrowLeft, Send } from 'lucide-svelte';

	let program = $state<Program | null>(null);
	let conversation = $state<Conversation | null>(null);
	let step = $state<'input' | 'conversation' | 'generating'>('input');
	let loading = $state(true);
	let messageLoading = $state(false);
	let readyToModify = $state(false);
	let initialRequest = $state('');

	onMount(async () => {
		const id = $page.params.id;
		if (id) {
			program = await programRepository.get(id) || null;
		}
		loading = false;
	});

	async function handleRequestSubmit() {
		if (!program || !initialRequest.trim()) return;

		messageLoading = true;
		try {
			// Include program context in the initial message
			const contextMessage = `I have a workout program called "${program.name}" that I'd like to modify.

Current program details:
- Description: ${program.description}
- Schedule: ${program.schedule.weeklyPattern.length} days per week
- Workouts: ${program.workouts.map(w => w.name).join(', ')}

My request: ${initialRequest}`;

			conversation = await conversationManager.createConversation('reevaluation', contextMessage, program.id);

			// Get initial AI response
			await conversationManager.getAssistantResponse(conversation.id);

			// Reload conversation to get updated messages
			const updated = await conversationRepository.get(conversation.id);
			if (updated) {
				conversation = updated;
			}

			// Check if already ready to modify
			readyToModify = await conversationManager.isReadyToModify(conversation.id);

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
			messageLoading = false;
		}
	}

	async function handleMessageSend(message: string) {
		if (!conversation) return;

		messageLoading = true;
		try {
			await conversationManager.addUserMessage(conversation.id, message);
			await conversationManager.getAssistantResponse(conversation.id);

			// Reload conversation
			const updated = await conversationRepository.get(conversation.id);
			if (updated) {
				conversation = updated;
			}

			// Check if ready to modify
			readyToModify = await conversationManager.isReadyToModify(conversation.id);
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
			messageLoading = false;
		}
	}

	async function handleModify() {
		if (!conversation || !program) return;

		step = 'generating';
		try {
			await programGenerator.modifyProgram(program.id, conversation.id);
			await conversationManager.completeConversation(conversation.id);
			goto(`/programs/${program.id}`);
		} catch (error) {
			console.error('Error modifying program:', error);
			const err = error as { status?: number; error?: { type?: string } };
			if (err.status === 529 || err.error?.type === 'overloaded_error') {
				alert('The AI service is currently overloaded. Please try again in a moment.');
			} else {
				const message = error instanceof Error ? error.message : 'Unknown error';
				alert(`Failed to modify program: ${message}`);
			}
			step = 'conversation';
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
		<div class="flex items-center gap-4">
			<button
				onclick={() => goto(`/programs/${program!.id}`)}
				class="text-secondary hover:text-primary touch-target"
			>
				<ArrowLeft size={24} />
			</button>
			<h1 class="text-xl font-bold text-primary">Adapt: {program.name}</h1>
		</div>

		{#if step === 'input'}
			<Card>
				<div class="space-y-4">
					<p class="text-secondary">
						Tell me what you'd like to change about your program. For example:
					</p>
					<ul class="text-sm text-muted space-y-1 ml-4">
						<li>- "I want to work out 4 days instead of 3"</li>
						<li>- "Add more upper body exercises"</li>
						<li>- "I injured my shoulder, need to avoid overhead movements"</li>
						<li>- "Make the workouts shorter, around 30 minutes"</li>
						<li>- "I got a barbell, can we add compound lifts?"</li>
					</ul>

					<div class="flex gap-2">
						<div class="flex-1">
							<Input
								bind:value={initialRequest}
								placeholder="What would you like to change?"
								disabled={messageLoading}
								onkeydown={handleKeydown}
							/>
						</div>
						<Button onclick={handleRequestSubmit} disabled={!initialRequest.trim() || messageLoading}>
							{#snippet children()}
								{#if messageLoading}
									<LoadingSpinner size="sm" />
								{:else}
									<Send size={20} />
								{/if}
							{/snippet}
						</Button>
					</div>
				</div>
			</Card>
		{:else if step === 'conversation' && conversation}
			<AIConversation
				messages={conversation.messages}
				loading={messageLoading}
				readyToGenerate={readyToModify}
				onsend={handleMessageSend}
				ongenerate={handleModify}
				generateButtonText="Update My Program"
			/>
		{:else if step === 'generating'}
			<div class="text-center py-12">
				<LoadingSpinner size="lg" />
				<p class="mt-4 text-lg text-secondary">Updating your workout program...</p>
				<p class="mt-2 text-sm text-muted">This may take a moment</p>
			</div>
		{/if}
	</div>
{/if}
