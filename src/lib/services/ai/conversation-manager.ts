import { postEventStream, postJSON } from './api-client';
import { conversationRepository } from '../storage/conversation-repository';
import type { Conversation, Message } from '$lib/types/conversation';
import type { AgentAction, AgentTurnResponse } from '$lib/types/agent';

interface AssistantResponseOptions {
	stream?: boolean;
	onChunk?: (chunk: string) => void;
	onStatus?: (step: string) => void;
	onAction?: (action: AgentAction) => void;
}

export class ConversationManager {
	async createConversation(
		type: 'onboarding' | 'reevaluation',
		initialMessage: string,
		programId?: string,
		displayContent?: string
	): Promise<Conversation> {
		const conversation = await conversationRepository.create({
			type,
			messages: [],
			status: 'active',
			programId
		});

		const userMessage = await this.addUserMessage(
			conversation.id,
			initialMessage,
			displayContent
		);
		return {
			...conversation,
			messages: [...conversation.messages, userMessage],
			updatedAt: new Date()
		};
	}

	async addUserMessage(conversationId: string, content: string, displayContent?: string): Promise<Message> {
		const message: Message = {
			role: 'user',
			content,
			displayContent,
			timestamp: new Date()
		};

		await conversationRepository.addMessage(conversationId, message);
		return message;
	}

	async getAssistantResponse(
		conversationId: string,
		options: AssistantResponseOptions = {}
	): Promise<AgentTurnResponse> {
		const conversation = await conversationRepository.get(conversationId);
		if (!conversation) {
			throw new Error('Conversation not found');
		}

		const messages = conversation.messages.map((m) => ({
			role: m.role,
			content: m.content
		}));

		if (options.stream) {
			let fullText = '';
			let action: AgentAction | undefined;

			await postEventStream(
				'/api/chat',
				{
					messages,
					conversationType: conversation.type,
					programId: conversation.programId,
					stream: true
				},
				(event) => {
					if (event.type === 'status' && event.step) {
						options.onStatus?.(event.step);
						return;
					}
					if (event.type === 'text' && event.text) {
						fullText += event.text;
						options.onChunk?.(event.text);
						return;
					}
					if (event.type === 'action' && event.action) {
						action = event.action as AgentAction;
						options.onAction?.(action);
					}
				}
			);

			const response: AgentTurnResponse = {
				text: fullText,
				action
			};
			const assistantMessage: Message = {
				role: 'assistant',
				content: response.text,
				timestamp: new Date()
			};
			await conversationRepository.addMessage(conversationId, assistantMessage);
			return response;
		}

		const response = await postJSON<AgentTurnResponse>('/api/chat', {
			messages,
			conversationType: conversation.type,
			programId: conversation.programId
		});
		const assistantMessage: Message = {
			role: 'assistant',
			content: response.text,
			timestamp: new Date()
		};
		await conversationRepository.addMessage(conversationId, assistantMessage);
		return response;
	}

	async completeConversation(conversationId: string): Promise<void> {
		await conversationRepository.updateStatus(conversationId, 'completed');
	}
}

export const conversationManager = new ConversationManager();
