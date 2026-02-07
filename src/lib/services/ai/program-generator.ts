import { postJSON } from './api-client';
import { conversationRepository } from '../storage/conversation-repository';
import { programRepository } from '../storage/program-repository';
import { exerciseDescriptionRepository } from '../storage/exercise-description-repository';
import { ProgramSchema } from '$lib/types/program';
import type { Program } from '$lib/types/program';
import { assertProgramInvariants, preserveProgramIdentity } from './program-integrity';

const WORKOUT_CREATE_LOG_PREFIX = '[workout:create]';

export class ProgramGenerator {
	private formatErrorDetails(error: unknown): Record<string, unknown> {
		if (error instanceof Error) {
			return { name: error.name, message: error.message };
		}
		if (typeof error === 'object' && error !== null) {
			const candidate = error as Record<string, unknown>;
			return {
				name: typeof candidate.name === 'string' ? candidate.name : undefined,
				message: typeof candidate.message === 'string' ? candidate.message : String(error),
				code: typeof candidate.code === 'string' ? candidate.code : undefined,
				details: typeof candidate.details === 'string' ? candidate.details : undefined,
				hint: typeof candidate.hint === 'string' ? candidate.hint : undefined
			};
		}
		return { message: String(error) };
	}

	private extractBalancedJSONObject(text: string): string {
		const start = text.indexOf('{');
		if (start === -1) {
			throw new Error('No JSON object start found in response');
		}

		let depth = 0;
		let inString = false;
		let escaped = false;

		for (let i = start; i < text.length; i++) {
			const char = text[i];

			if (escaped) {
				escaped = false;
				continue;
			}

			if (char === '\\') {
				escaped = true;
				continue;
			}

			if (char === '"') {
				inString = !inString;
				continue;
			}

			if (inString) continue;

			if (char === '{') depth++;
			if (char === '}') {
				depth--;
				if (depth === 0) {
					return text.slice(start, i + 1);
				}
			}
		}

		throw new Error('Unbalanced JSON object in response');
	}

	private extractJSON(text: string): string {
		// Try to find JSON in markdown code blocks
		const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
		if (codeBlockMatch) {
			return codeBlockMatch[1];
		}

		// Fall back to balanced JSON extraction
		return this.extractBalancedJSONObject(text);
	}

	private parseAndValidate(jsonString: string): Program {
		const parsed = JSON.parse(jsonString);
		const validated = ProgramSchema.parse(parsed);

		// Convert date strings to Date objects
		const program = {
			...validated,
			startDate: new Date(validated.startDate),
			createdAt: new Date(),
			updatedAt: new Date()
		};
		assertProgramInvariants(program);
		return program;
	}

	private async parseWithRepair(rawText: string, currentProgram?: Program): Promise<Program> {
		let extracted = '';
		let parseError = '';
		let validationError = '';
		console.info(`${WORKOUT_CREATE_LOG_PREFIX} Parse pipeline started`, {
			rawTextLength: rawText.length,
			hasCurrentProgram: Boolean(currentProgram)
		});

		try {
			extracted = this.extractJSON(rawText);
			console.info(`${WORKOUT_CREATE_LOG_PREFIX} Initial JSON extraction succeeded`, {
				extractedLength: extracted.length
			});
			return this.parseAndValidate(extracted);
		} catch (error) {
			parseError = error instanceof Error ? error.message : String(error);
			console.warn(`${WORKOUT_CREATE_LOG_PREFIX} Initial parse failed`, {
				parseError
			});
		}

		console.info(`${WORKOUT_CREATE_LOG_PREFIX} Attempting repair pass 1`, {
			parseError,
			validationError
		});
		const repair = await postJSON<{ text: string }>('/api/programs/repair', {
			rawText,
			parseError,
			validationError,
			currentProgram
		});

		extracted = this.extractJSON(repair.text);
		try {
			console.info(`${WORKOUT_CREATE_LOG_PREFIX} Repair pass 1 produced JSON`, {
				extractedLength: extracted.length
			});
			return this.parseAndValidate(extracted);
		} catch (error) {
			validationError = error instanceof Error ? error.message : String(error);
			console.warn(`${WORKOUT_CREATE_LOG_PREFIX} Validation failed after repair pass 1`, {
				validationError
			});
		}

		// One final repair attempt with explicit validation feedback
		console.info(`${WORKOUT_CREATE_LOG_PREFIX} Attempting repair pass 2`, {
			parseError,
			validationError
		});
		const secondRepair = await postJSON<{ text: string }>('/api/programs/repair', {
			rawText: repair.text,
			parseError,
			validationError,
			currentProgram
		});

		extracted = this.extractJSON(secondRepair.text);
		console.info(`${WORKOUT_CREATE_LOG_PREFIX} Repair pass 2 produced JSON`, {
			extractedLength: extracted.length
		});
		return this.parseAndValidate(extracted);
	}

	async generateFromConversation(conversationId: string): Promise<Program> {
		console.info(`${WORKOUT_CREATE_LOG_PREFIX} Generate requested`, { conversationId });
		try {
			const conversation = await conversationRepository.get(conversationId);
			if (!conversation) {
				throw new Error('Conversation not found');
			}

			const messages = conversation.messages.map((m) => ({
				role: m.role,
				content: m.content
			}));
			console.info(`${WORKOUT_CREATE_LOG_PREFIX} Loaded conversation`, {
				conversationId,
				messageCount: messages.length
			});

			const response = await postJSON<{ text: string }>('/api/programs/generate', {
				messages
			});
			console.info(`${WORKOUT_CREATE_LOG_PREFIX} Generation response received`, {
				conversationId,
				responseLength: response.text.length
			});

			const program = await this.parseWithRepair(response.text);
			console.info(`${WORKOUT_CREATE_LOG_PREFIX} Parsed program`, {
				conversationId,
				programName: program.name,
				workoutCount: program.workouts.length,
				scheduleDays: program.schedule.weeklyPattern.length
			});

			// Save to database (repository will generate ID)
			const { id, createdAt, updatedAt, ...programData } = program;
			const savedProgram = await programRepository.create(programData);
			console.info(`${WORKOUT_CREATE_LOG_PREFIX} Program saved`, {
				conversationId,
				programId: savedProgram.id
			});

			return savedProgram;
		} catch (error) {
			const details = this.formatErrorDetails(error);
			console.error(`${WORKOUT_CREATE_LOG_PREFIX} Generate failed`, {
				conversationId,
				...details
			});
			throw error;
		}
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
		let exerciseDetails: string | undefined;
		try {
			const descriptions = await exerciseDescriptionRepository.getByNames([...exerciseNames]);
			if (descriptions.size > 0) {
				const detailsArray: string[] = [];
				for (const [name, description] of descriptions) {
					detailsArray.push(`### ${name}\n${description}`);
				}
				exerciseDetails = detailsArray.join('\n\n');
			}
		} catch (err) {
			console.warn('Failed to fetch exercise descriptions:', err);
		}

		const messages = conversation.messages.map((m) => ({
			role: m.role,
			content: m.content
		}));

		const response = await postJSON<{ text: string }>('/api/programs/modify', {
			messages,
			currentProgram: program,
			exerciseDetails
		});

		const modifiedProgram = await this.parseWithRepair(response.text, program);
		const mergedProgram = preserveProgramIdentity(program, modifiedProgram);
		assertProgramInvariants(mergedProgram);

		// Update existing program
		await programRepository.update(programId, mergedProgram);

		return { ...mergedProgram, id: programId };
	}
}

export const programGenerator = new ProgramGenerator();
