import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClaudeToolDefinition, StepLogger } from '$lib/server/claude-client';
import { ProgramSchema, type Program } from '$lib/types/program';
import type { AgentAction } from '$lib/types/agent';
import { assertProgramInvariants, preserveProgramIdentity } from '$lib/services/ai/program-integrity';
import { buildProgramChangeSet } from '$lib/services/ai/program-diff';
import { createServerClient } from '$lib/server/auth';

const createProgramToolInputSchema = z.object({
	program: z.unknown(),
	reason: z.string().optional()
});

const modifyProgramToolInputSchema = z.object({
	programId: z.string().optional(),
	updatedProgram: z.unknown().optional(),
	program: z.unknown().optional(),
	reason: z.string().optional()
});

const PROGRAM_PATTERN_ITEM_JSON_SCHEMA = {
	type: 'object',
	properties: {
		dayOfWeek: { type: 'integer', minimum: 0, maximum: 6 },
		workoutIndex: { type: 'integer', minimum: 0 },
		dayName: { type: 'string' },
		workoutId: { type: 'string' },
		workoutName: { type: 'string' }
	}
};

const PROGRAM_EXERCISE_JSON_SCHEMA = {
	type: 'object',
	properties: {
		id: { type: 'string' },
		name: { type: 'string', minLength: 1 },
		sets: { type: 'integer', minimum: 1 },
		reps: { type: 'string' },
		duration: { type: 'integer', minimum: 1 },
		restBetweenSets: { type: 'integer', minimum: 0 },
		restBetweenExercises: { type: 'integer', minimum: 0 },
		equipment: { type: 'array', items: { type: 'string' } },
		notes: { type: 'string' },
		type: { type: 'string', enum: ['warmup', 'main', 'cooldown'] }
	},
	required: ['id', 'name', 'sets', 'restBetweenSets', 'restBetweenExercises', 'type']
};

const PROGRAM_WORKOUT_JSON_SCHEMA = {
	type: 'object',
	properties: {
		id: { type: 'string' },
		name: { type: 'string', minLength: 1 },
		type: {
			type: 'string',
			enum: ['strength', 'cardio', 'flexibility', 'mobility', 'mixed']
		},
		estimatedDuration: { type: 'integer', minimum: 1 },
		exercises: {
			type: 'array',
			minItems: 1,
			items: PROGRAM_EXERCISE_JSON_SCHEMA
		},
		notes: { type: 'string' }
	},
	required: ['id', 'name', 'type', 'estimatedDuration', 'exercises']
};

const PROGRAM_JSON_SCHEMA = {
	type: 'object',
	properties: {
		id: { type: 'string' },
		name: { type: 'string', minLength: 1 },
		description: { type: 'string' },
		startDate: { type: 'string' },
		isPaused: { type: 'boolean' },
		schedule: {
			type: 'object',
			properties: {
				weeklyPattern: {
					type: 'array',
					minItems: 1,
					items: PROGRAM_PATTERN_ITEM_JSON_SCHEMA
				},
				duration: { type: 'number' }
			},
			required: ['weeklyPattern']
		},
		workouts: {
			type: 'array',
			minItems: 1,
			items: PROGRAM_WORKOUT_JSON_SCHEMA
		}
	},
	required: ['id', 'name', 'description', 'startDate', 'schedule', 'workouts']
};

function normalizeExerciseName(name: string): string {
	return name.toLowerCase().trim().replace(/\s+/g, '_');
}

const DAY_INDEX_BY_NAME: Record<string, number> = {
	monday: 0,
	mon: 0,
	tuesday: 1,
	tue: 1,
	tues: 1,
	wednesday: 2,
	wed: 2,
	thursday: 3,
	thu: 3,
	thurs: 3,
	friday: 4,
	fri: 4,
	saturday: 5,
	sat: 5,
	sunday: 6,
	sun: 6
};

function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	return value as Record<string, unknown>;
}

function parseInteger(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isInteger(value)) return value;
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	if (!/^-?\d+$/.test(trimmed)) return undefined;
	return Number.parseInt(trimmed, 10);
}

function parseDayOfWeek(value: unknown): number | undefined {
	const numeric = parseInteger(value);
	if (numeric !== undefined && numeric >= 0 && numeric <= 6) {
		return numeric;
	}

	if (typeof value !== 'string') return undefined;
	const normalized = value.trim().toLowerCase().replace(/[^a-z]/g, '');
	if (!normalized) return undefined;
	return DAY_INDEX_BY_NAME[normalized];
}

function normalizeWorkoutName(name: string): string {
	return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function resolveWorkoutIndex(
	entry: Record<string, unknown>,
	workoutIndexById: Map<string, number>,
	workoutIndexByName: Map<string, number>
): number | undefined {
	const directIndex = parseInteger(entry.workoutIndex ?? entry.workout_index);
	if (directIndex !== undefined) return directIndex;

	const workoutId = entry.workoutId ?? entry.workout_id;
	if (typeof workoutId === 'string') {
		const byId = workoutIndexById.get(workoutId.trim());
		if (byId !== undefined) return byId;
	}

	const rawWorkoutName = entry.workoutName ?? entry.workout_name ?? entry.workout;
	if (typeof rawWorkoutName === 'string') {
		const byName = workoutIndexByName.get(normalizeWorkoutName(rawWorkoutName));
		if (byName !== undefined) return byName;
	}

	const nestedWorkout = asRecord(entry.workout);
	if (nestedWorkout) {
		const nestedId = nestedWorkout.id;
		if (typeof nestedId === 'string') {
			const byId = workoutIndexById.get(nestedId.trim());
			if (byId !== undefined) return byId;
		}
		const nestedName = nestedWorkout.name;
		if (typeof nestedName === 'string') {
			const byName = workoutIndexByName.get(normalizeWorkoutName(nestedName));
			if (byName !== undefined) return byName;
		}
	}

	return undefined;
}

function normalizeScheduleAliases(input: unknown): unknown {
	const root = asRecord(input);
	if (!root) return input;

	const workouts = Array.isArray(root.workouts) ? root.workouts : [];
	const workoutIndexById = new Map<string, number>();
	const workoutIndexByName = new Map<string, number>();
	for (let index = 0; index < workouts.length; index++) {
		const workout = asRecord(workouts[index]);
		if (!workout) continue;

		const workoutId = workout.id;
		if (typeof workoutId === 'string' && workoutId.trim()) {
			workoutIndexById.set(workoutId.trim(), index);
		}

		const workoutName = workout.name;
		if (typeof workoutName === 'string') {
			const normalizedName = normalizeWorkoutName(workoutName);
			if (normalizedName && !workoutIndexByName.has(normalizedName)) {
				workoutIndexByName.set(normalizedName, index);
			}
		}
	}

	const schedule = asRecord(root.schedule);
	if (!schedule || !Array.isArray(schedule.weeklyPattern)) return input;

	const normalizedPattern = schedule.weeklyPattern.map((item) => {
		const entry = asRecord(item);
		if (!entry) return item;

		const dayCandidate =
			entry.dayName ??
			entry.day_name ??
			entry.day ??
			entry.weekday ??
			entry.weekdayName ??
			entry.dayOfWeek ??
			entry.day_of_week;
		const normalizedDayOfWeek = parseDayOfWeek(dayCandidate);
		const normalizedWorkoutIndex = resolveWorkoutIndex(
			entry,
			workoutIndexById,
			workoutIndexByName
		);

		return {
			...entry,
			...(normalizedDayOfWeek !== undefined ? { dayOfWeek: normalizedDayOfWeek } : {}),
			...(normalizedWorkoutIndex !== undefined ? { workoutIndex: normalizedWorkoutIndex } : {})
		};
	});

	return {
		...root,
		schedule: {
			...schedule,
			weeklyPattern: normalizedPattern
		}
	};
}

function mapProgramRow(data: Record<string, unknown>): Program {
	return {
		id: data.id as string,
		userId: (data.user_id as string) || undefined,
		currentVersionId: (data.current_version_id as string) || undefined,
		isPaused: Boolean(data.is_paused ?? false),
		name: data.name as string,
		description: data.description as string,
		startDate: new Date(data.start_date as string),
		schedule: data.schedule as Program['schedule'],
		workouts: data.workouts as Program['workouts'],
		createdAt: new Date(data.created_at as string),
		updatedAt: new Date(data.updated_at as string)
	};
}

function normalizeProgramInput(input: unknown, overrideId?: string): Program {
	const parsed = ProgramSchema.parse(normalizeScheduleAliases(input));
	const normalized: Program = {
		...parsed,
		id: overrideId ?? parsed.id,
		startDate: parsed.startDate instanceof Date ? parsed.startDate : new Date(parsed.startDate),
		isPaused: parsed.isPaused ?? false,
		createdAt:
			parsed.createdAt instanceof Date
				? parsed.createdAt
				: parsed.createdAt
					? new Date(parsed.createdAt)
					: new Date(),
		updatedAt:
			parsed.updatedAt instanceof Date
				? parsed.updatedAt
				: parsed.updatedAt
					? new Date(parsed.updatedAt)
					: new Date()
	};

	assertProgramInvariants(normalized);
	return normalized;
}

async function ensureAppUserId(supabase: SupabaseClient, authUserId: string): Promise<string> {
	const { data: existing, error: lookupError } = await supabase
		.from('users')
		.select('id')
		.eq('auth_user_id', authUserId)
		.maybeSingle();

	if (lookupError) {
		throw lookupError;
	}
	if (existing?.id) return existing.id as string;

	const { data: inserted, error: insertError } = await supabase
		.from('users')
		.insert({
			auth_user_id: authUserId,
			objectives: '',
			profile: {
				fitnessLevel: 'beginner',
				availableEquipment: [],
				schedule: { daysPerWeek: 3 }
			}
		})
		.select('id')
		.single();

	if (insertError) throw insertError;
	return inserted.id as string;
}

async function getOwnedProgram(
	supabase: SupabaseClient,
	appUserId: string,
	programId: string
): Promise<Program> {
	const { data, error } = await supabase
		.from('programs')
		.select()
		.eq('id', programId)
		.eq('user_id', appUserId)
		.single();

	if (error) throw error;
	return mapProgramRow(data as Record<string, unknown>);
}

async function getCurrentVersionId(
	supabase: SupabaseClient,
	appUserId: string,
	programId: string
): Promise<string | undefined> {
	const { data, error } = await supabase
		.from('programs')
		.select('current_version_id')
		.eq('id', programId)
		.eq('user_id', appUserId)
		.single();

	if (error) throw error;
	return (data.current_version_id as string) || undefined;
}

export interface ReevalContext {
	program: Program;
	exerciseDetails?: string;
}

export async function loadReevaluationContext(
	authUserId: string,
	programId: string,
	logStep?: StepLogger
): Promise<ReevalContext> {
	logStep?.('reeval.context.start', { programId });
	const supabase = createServerClient();
	logStep?.('db.users.ensure_for_reeval.start');
	const appUserId = await ensureAppUserId(supabase, authUserId);
	logStep?.('db.users.ensure_for_reeval.done', { appUserId });
	logStep?.('db.programs.load_for_reeval.start', { programId });
	const program = await getOwnedProgram(supabase, appUserId, programId);
	logStep?.('db.programs.load_for_reeval.done', {
		workoutCount: program.workouts.length,
		scheduleDays: program.schedule.weeklyPattern.length
	});

	const exerciseNames = [
		...new Set(program.workouts.flatMap((workout) => workout.exercises.map((exercise) => exercise.name)))
	];
	if (exerciseNames.length === 0) {
		logStep?.('reeval.context.completed_without_descriptions');
		return { program };
	}

	const normalizedNames = exerciseNames.map(normalizeExerciseName);
	logStep?.('db.exercise_descriptions.lookup.start', {
		normalizedNameCount: normalizedNames.length
	});
	const { data, error } = await supabase
		.from('exercise_descriptions')
		.select('exercise_name,description,normalized_name')
		.in('normalized_name', normalizedNames);
	logStep?.('db.exercise_descriptions.lookup.done', {
		returnedRows: data?.length ?? 0,
		hasError: Boolean(error)
	});

	if (error) {
		console.warn('Failed to load exercise descriptions for reevaluation context', error);
		logStep?.('reeval.context.completed_with_lookup_error', {
			errorMessage: error.message
		});
		return { program };
	}

	if (!data || data.length === 0) {
		logStep?.('reeval.context.completed_without_matches');
		return { program };
	}

	const exerciseDetails = data
		.map((row) => `### ${row.exercise_name as string}\n${row.description as string}`)
		.join('\n\n');
	logStep?.('reeval.context.completed_with_descriptions', {
		exerciseDetailsLength: exerciseDetails.length
	});

	return { program, exerciseDetails };
}

export function isAgentAction(value: unknown): value is AgentAction {
	if (!value || typeof value !== 'object') return false;
	const candidate = value as Record<string, unknown>;
	if (candidate.type === 'create_program') {
		return typeof candidate.programId === 'string';
	}
	if (candidate.type === 'modify_program') {
		return typeof candidate.programId === 'string' && Array.isArray(candidate.changeSet);
	}
	return false;
}

export function getWorkoutAgentTools(params: {
	authUserId: string;
	conversationType: 'onboarding' | 'reevaluation';
	conversationProgramId?: string;
	logStep?: StepLogger;
}): ClaudeToolDefinition[] {
	const supabase = createServerClient();
	const baseContext = { supabase, authUserId: params.authUserId };
	const logStep = params.logStep;

	const createProgramTool: ClaudeToolDefinition = {
		name: 'create_program',
		description:
			'Persist a brand-new workout program for this user after enough onboarding details are collected.',
		inputSchema: {
			type: 'object',
			properties: {
				program: {
					...PROGRAM_JSON_SCHEMA,
					description:
						'Complete Program JSON. Required fields include schedule.weeklyPattern and workout/exercise IDs. dayOfWeek is Monday-based: 0=Mon..6=Sun.'
				},
				reason: {
					type: 'string',
					description: 'Short reason explaining why this program fits the user.'
				}
			},
			required: ['program']
		},
		execute: async (rawInput): Promise<AgentAction> => {
			logStep?.('tool.create_program.start');
			const input = createProgramToolInputSchema.parse(rawInput);
			logStep?.('tool.create_program.validated');
			logStep?.('db.users.ensure_for_create.start');
			const appUserId = await ensureAppUserId(baseContext.supabase, baseContext.authUserId);
			logStep?.('db.users.ensure_for_create.done', { appUserId });
			const parsedProgram = normalizeProgramInput(input.program);
			logStep?.('tool.create_program.program.ready', {
				workoutCount: parsedProgram.workouts.length,
				scheduleDays: parsedProgram.schedule.weeklyPattern.length
			});

			logStep?.('db.programs.insert.start');
			const { data: inserted, error: insertError } = await baseContext.supabase
				.from('programs')
				.insert({
					user_id: appUserId,
					is_paused: parsedProgram.isPaused ?? false,
					name: parsedProgram.name,
					description: parsedProgram.description,
					start_date: parsedProgram.startDate,
					schedule: parsedProgram.schedule,
					workouts: parsedProgram.workouts
				})
				.select('id')
				.single();

			if (insertError) throw insertError;
			logStep?.('db.programs.insert.done', {
				insertedProgramId: inserted.id as string
			});

			const programId = inserted.id as string;
			logStep?.('db.programs.current_version.lookup.start', { programId });
			const programVersionId = await getCurrentVersionId(baseContext.supabase, appUserId, programId);
			logStep?.('db.programs.current_version.lookup.done', {
				programId,
				programVersionId
			});

			logStep?.('tool.create_program.completed', {
				programId,
				programVersionId
			});
			return {
				type: 'create_program',
				programId,
				programVersionId
			};
		}
	};

	const modifyProgramTool: ClaudeToolDefinition = {
		name: 'modify_program',
		description:
			'Persist modifications to an existing workout program and return a structured change set.',
		inputSchema: {
			type: 'object',
			properties: {
				programId: {
					type: 'string',
					description: 'Program id. Optional if already known from conversation context.'
				},
				updatedProgram: {
					...PROGRAM_JSON_SCHEMA,
					description:
						'Full updated Program JSON preserving IDs for unchanged workouts/exercises whenever possible.'
				},
				reason: {
					type: 'string',
					description: 'Short summary of what changed and why.'
				}
			},
			required: ['updatedProgram']
		},
		execute: async (rawInput): Promise<AgentAction> => {
			logStep?.('tool.modify_program.start');
			const input = modifyProgramToolInputSchema.parse(rawInput);
			logStep?.('tool.modify_program.validated');
			logStep?.('db.users.ensure_for_modify.start');
			const appUserId = await ensureAppUserId(baseContext.supabase, baseContext.authUserId);
			logStep?.('db.users.ensure_for_modify.done', { appUserId });
			const targetProgramId = input.programId ?? params.conversationProgramId;
			if (!targetProgramId) {
				throw new Error('No programId provided for modify_program');
			}
			logStep?.('tool.modify_program.target_program.resolved', { targetProgramId });

			logStep?.('db.programs.load_for_modify.start', { targetProgramId });
			const currentProgram = await getOwnedProgram(baseContext.supabase, appUserId, targetProgramId);
			logStep?.('db.programs.load_for_modify.done', {
				workoutCount: currentProgram.workouts.length,
				scheduleDays: currentProgram.schedule.weeklyPattern.length
			});
			const rawUpdatedProgram = input.updatedProgram ?? input.program;
			if (!rawUpdatedProgram) {
				throw new Error('modify_program requires updatedProgram');
			}

			const parsedUpdatedProgram = normalizeProgramInput(rawUpdatedProgram, currentProgram.id);
			logStep?.('tool.modify_program.updated_program.ready', {
				workoutCount: parsedUpdatedProgram.workouts.length,
				scheduleDays: parsedUpdatedProgram.schedule.weeklyPattern.length
			});
			const mergedProgram = preserveProgramIdentity(currentProgram, parsedUpdatedProgram);
			assertProgramInvariants(mergedProgram);
			logStep?.('tool.modify_program.program.merged');
			const changeSet = buildProgramChangeSet(currentProgram, mergedProgram);
			logStep?.('tool.modify_program.changeset.ready', {
				changeCount: changeSet.length
			});
			const previousVersionId = currentProgram.currentVersionId;

			logStep?.('db.programs.update.start');
			const { error: updateError } = await baseContext.supabase
				.from('programs')
				.update({
					name: mergedProgram.name,
					description: mergedProgram.description,
					start_date: mergedProgram.startDate,
					schedule: mergedProgram.schedule,
					workouts: mergedProgram.workouts
				})
				.eq('id', currentProgram.id)
				.eq('user_id', appUserId);

			if (updateError) throw updateError;
			logStep?.('db.programs.update.done', {
				programId: currentProgram.id
			});

			logStep?.('db.programs.current_version.lookup.start', {
				programId: currentProgram.id
			});
			const programVersionId = await getCurrentVersionId(
				baseContext.supabase,
				appUserId,
				currentProgram.id
			);
			logStep?.('db.programs.current_version.lookup.done', {
				programId: currentProgram.id,
				programVersionId
			});

			logStep?.('tool.modify_program.completed', {
				programId: currentProgram.id,
				previousVersionId,
				programVersionId,
				changeCount: changeSet.length
			});
			return {
				type: 'modify_program',
				programId: currentProgram.id,
				previousVersionId,
				programVersionId,
				changeSet
			};
		}
	};

	return params.conversationType === 'onboarding'
		? [createProgramTool]
		: [modifyProgramTool];
}
