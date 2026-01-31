import { supabase } from './supabase';
import { getAppUserId } from '$lib/stores/auth-store.svelte';
import type { Conversation, Message } from '$lib/types/conversation';

export class ConversationRepository {
	async create(
		conversation: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>
	): Promise<Conversation> {
		const userId = await getAppUserId();
		if (!userId) {
			throw new Error('User must be authenticated to create a conversation');
		}

		const { data, error } = await supabase
			.from('conversations')
			.insert({
				user_id: userId,
				type: conversation.type,
				messages: conversation.messages,
				status: conversation.status,
				program_id: conversation.programId || null
			})
			.select()
			.single();

		if (error) throw error;
		return this.mapFromDb(data);
	}

	async get(id: string): Promise<Conversation | undefined> {
		const { data, error } = await supabase.from('conversations').select().eq('id', id).single();

		if (error) {
			if (error.code === 'PGRST116') return undefined;
			throw error;
		}
		return this.mapFromDb(data);
	}

	async getByType(type: 'onboarding' | 'reevaluation'): Promise<Conversation[]> {
		const { data, error } = await supabase.from('conversations').select().eq('type', type);

		if (error) throw error;
		return (data || []).map((row) => this.mapFromDb(row));
	}

	async addMessage(id: string, message: Message): Promise<void> {
		const conversation = await this.get(id);
		if (!conversation) return;

		const updatedMessages = [...conversation.messages, message];

		const { error } = await supabase
			.from('conversations')
			.update({ messages: updatedMessages })
			.eq('id', id);

		if (error) throw error;
	}

	async updateStatus(id: string, status: 'active' | 'completed'): Promise<void> {
		const { error } = await supabase.from('conversations').update({ status }).eq('id', id);

		if (error) throw error;
	}

	async delete(id: string): Promise<void> {
		const { error } = await supabase.from('conversations').delete().eq('id', id);
		if (error) throw error;
	}

	private mapFromDb(data: Record<string, unknown>): Conversation {
		const messages = (data.messages as Array<Record<string, unknown>>) || [];
		return {
			id: data.id as string,
			type: data.type as Conversation['type'],
			messages: messages.map((m) => ({
				role: m.role as Message['role'],
				content: m.content as string,
				timestamp: new Date(m.timestamp as string)
			})),
			status: data.status as Conversation['status'],
			userId: (data.user_id as string) || undefined,
			programId: (data.program_id as string) || undefined,
			createdAt: new Date(data.created_at as string),
			updatedAt: new Date(data.updated_at as string)
		};
	}
}

export const conversationRepository = new ConversationRepository();
