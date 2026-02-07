import { postJSON } from './api-client';
import { conversationRepository } from '../storage/conversation-repository';
import type { Conversation, Message } from '$lib/types/conversation';
import type { AgentTurnResponse } from '$lib/types/agent';

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

		await this.addUserMessage(conversation.id, initialMessage, displayContent);
		return conversation;
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
		conversationId: string
	): Promise<AgentTurnResponse> {
		const conversation = await conversationRepository.get(conversationId);
		if (!conversation) {
			throw new Error('Conversation not found');
		}

		const messages = conversation.messages.map((m) => ({
			role: m.role,
			content: m.content
		}));

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
