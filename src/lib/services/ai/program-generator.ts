import { claudeClient } from './claude-client';
import { conversationRepository } from '../storage/conversation-repository';
import { programRepository } from '../storage/program-repository';
import { exerciseDescriptionRepository } from '../storage/exercise-description-repository';
import { GENERATION_SYSTEM_PROMPT } from './prompts/generation-prompt';
import { REEVALUATION_SYSTEM_PROMPT } from './prompts/reevaluation-prompt';
import { ProgramSchema } from '$lib/types/program';
import type { Program } from '$lib/types/program';

export class ProgramGenerator {
	private extractJSON(text: string): string {
		// Try to find JSON in markdown code blocks
		const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
		if (codeBlockMatch) {
			return codeBlockMatch[1];
		}

		// Try to find raw JSON object
		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			return jsonMatch[0];
		}

		throw new Error('No JSON found in response');
	}

	private parseAndValidate(jsonString: string): Program {
		const parsed = JSON.parse(jsonString);
		const validated = ProgramSchema.parse(parsed);

		// Convert date strings to Date objects
		return {
			...validated,
			startDate: new Date(validated.startDate),
			createdAt: new Date(),
			updatedAt: new Date()
		};
	}

	async generateFromConversation(conversationId: string): Promise<Program> {
		const conversation = await conversationRepository.get(conversationId);
		if (!conversation) {
			throw new Error('Conversation not found');
		}

		const messages = conversation.messages.map((m) => ({
			role: m.role,
			content: m.content
		}));

		// Add a final prompt to generate the program
		messages.push({
			role: 'user',
			content: 'Please generate my workout program now as JSON.'
		});

		const response = await claudeClient.sendMessage(messages, GENERATION_SYSTEM_PROMPT);

		const jsonString = this.extractJSON(response);
		const program = this.parseAndValidate(jsonString);

		// Save to database (repository will generate ID)
		const { id, createdAt, updatedAt, ...programData } = program;
		const savedProgram = await programRepository.create(programData);

		return savedProgram;
	}

	async modifyProgram(programId: string, conversationId: string): Promise<Program> {
		const [program, conversation] = await Promise.all([
			programRepository.get(programId),
			conversationRepository.get(conversationId)
		]);

		if (!program) throw new Error('Program not found');
		if (!conversation) throw new Error('Conversation not found');

		// Extract all unique exercise names from the program
		const exerciseNames = new Set<string>();
		for (const workout of program.workouts) {
			for (const exercise of workout.exercises) {
				exerciseNames.add(exercise.name);
			}
		}

		// Fetch exercise descriptions from database
		let exerciseDetails = '';
		try {
			const descriptions = await exerciseDescriptionRepository.getByNames([...exerciseNames]);
			if (descriptions.size > 0) {
				const detailsArray: string[] = [];
				for (const [name, description] of descriptions) {
					detailsArray.push(`### ${name}\n${description}`);
				}
				exerciseDetails = `\n\nExercise Details (for reference when making modifications):\n${detailsArray.join('\n\n')}`;
			}
		} catch (err) {
			console.warn('Failed to fetch exercise descriptions:', err);
		}

		const messages = conversation.messages.map((m) => ({
			role: m.role,
			content: m.content
		}));

		// Add context about the current program and exercise details
		messages.unshift({
			role: 'user',
			content: `Current program:\n${JSON.stringify(program, null, 2)}${exerciseDetails}`
		});

		// Add final prompt
		messages.push({
			role: 'user',
			content: 'Please provide the modified workout program as JSON.'
		});

		const response = await claudeClient.sendMessage(messages, REEVALUATION_SYSTEM_PROMPT);

		const jsonString = this.extractJSON(response);
		const modifiedProgram = this.parseAndValidate(jsonString);

		// Update existing program
		await programRepository.update(programId, modifiedProgram);

		return { ...modifiedProgram, id: programId };
	}
}

export const programGenerator = new ProgramGenerator();
