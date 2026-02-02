import { postJSON, postStream } from './api-client';
import { conversationRepository } from '../storage/conversation-repository';
import { programRepository } from '../storage/program-repository';
import { exerciseDescriptionRepository } from '../storage/exercise-description-repository';
import type { Conversation, Message } from '$lib/types/conversation';

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
		conversationId: string,
		onChunk?: (text: string) => void
	): Promise<string> {
		const conversation = await conversationRepository.get(conversationId);
		if (!conversation) {
			throw new Error('Conversation not found');
		}

		// For reevaluation conversations, include exercise details
		let exerciseDetails: string | undefined;
		if (conversation.type === 'reevaluation' && conversation.programId) {
			exerciseDetails = await this.getExerciseDetailsForProgram(conversation.programId);
		}

		const messages = conversation.messages.map((m) => ({
			role: m.role,
			content: m.content
		}));

		let responseText = '';

		if (onChunk) {
			await postStream(
				'/api/chat',
				{
					messages,
					conversationType: conversation.type,
					exerciseDetails,
					stream: true
				},
				(chunk) => {
					responseText += chunk;
					onChunk(chunk);
				}
			);
		} else {
			const response = await postJSON<{ text: string }>('/api/chat', {
				messages,
				conversationType: conversation.type,
				exerciseDetails,
				stream: false
			});
			responseText = response.text;
		}

		const assistantMessage: Message = {
			role: 'assistant',
			content: responseText,
			timestamp: new Date()
		};

		await conversationRepository.addMessage(conversationId, assistantMessage);

		return responseText;
	}

	private async getExerciseDetailsForProgram(programId: string): Promise<string | undefined> {
		try {
			const program = await programRepository.get(programId);
			if (!program) return undefined;

			// Extract all unique exercise names from the program
			const exerciseNames = new Set<string>();
			for (const workout of program.workouts) {
				for (const exercise of workout.exercises) {
					exerciseNames.add(exercise.name);
				}
			}

			// Fetch exercise descriptions from database
			const descriptions = await exerciseDescriptionRepository.getByNames([...exerciseNames]);
			if (descriptions.size === 0) return undefined;

			const detailsArray: string[] = [];
			for (const [name, description] of descriptions) {
				detailsArray.push(`### ${name}\n${description}`);
			}
			return detailsArray.join('\n\n');
		} catch (err) {
			console.warn('Failed to fetch exercise descriptions:', err);
			return undefined;
		}
	}

	async isReadyToGenerate(conversationId: string): Promise<boolean> {
		const conversation = await conversationRepository.get(conversationId);
		if (!conversation) return false;

		const lastMessage = conversation.messages[conversation.messages.length - 1];
		return lastMessage?.role === 'assistant' && lastMessage.content.includes('READY_TO_GENERATE');
	}

	async isReadyToModify(conversationId: string): Promise<boolean> {
		const conversation = await conversationRepository.get(conversationId);
		if (!conversation) return false;

		const lastMessage = conversation.messages[conversation.messages.length - 1];
		return lastMessage?.role === 'assistant' && lastMessage.content.includes('READY_TO_MODIFY');
	}

	async completeConversation(conversationId: string): Promise<void> {
		await conversationRepository.updateStatus(conversationId, 'completed');
	}
}

export const conversationManager = new ConversationManager();
