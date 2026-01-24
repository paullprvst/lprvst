import { db } from './db';
import type { Conversation, Message } from '$lib/types/conversation';

export class ConversationRepository {
	async create(
		conversation: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>
	): Promise<Conversation> {
		const newConversation: Conversation = {
			...conversation,
			id: crypto.randomUUID(),
			createdAt: new Date(),
			updatedAt: new Date()
		};
		await db.conversations.add(newConversation);
		return newConversation;
	}

	async get(id: string): Promise<Conversation | undefined> {
		return await db.conversations.get(id);
	}

	async getByType(type: 'onboarding' | 'reevaluation'): Promise<Conversation[]> {
		return await db.conversations.where('type').equals(type).toArray();
	}

	async addMessage(id: string, message: Message): Promise<void> {
		const conversation = await db.conversations.get(id);
		if (conversation) {
			conversation.messages.push(message);
			await db.conversations.update(id, {
				messages: conversation.messages,
				updatedAt: new Date()
			});
		}
	}

	async updateStatus(id: string, status: 'active' | 'completed'): Promise<void> {
		await db.conversations.update(id, {
			status,
			updatedAt: new Date()
		});
	}

	async delete(id: string): Promise<void> {
		await db.conversations.delete(id);
	}
}

export const conversationRepository = new ConversationRepository();
