import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClaudeToolDefinition } from '$lib/server/claude-client';
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
	programId: string
): Promise<ReevalContext> {
	const supabase = createServerClient();
	const appUserId = await ensureAppUserId(supabase, authUserId);
	const program = await getOwnedProgram(supabase, appUserId, programId);

	const exerciseNames = [
		...new Set(program.workouts.flatMap((workout) => workout.exercises.map((exercise) => exercise.name)))
	];
	if (exerciseNames.length === 0) {
		return { program };
	}

	const normalizedNames = exerciseNames.map(normalizeExerciseName);
	const { data, error } = await supabase
		.from('exercise_descriptions')
		.select('exercise_name,description,normalized_name')
		.in('normalized_name', normalizedNames);

	if (error) {
		console.warn('Failed to load exercise descriptions for reevaluation context', error);
		return { program };
	}

	if (!data || data.length === 0) return { program };

	const exerciseDetails = data
		.map((row) => `### ${row.exercise_name as string}\n${row.description as string}`)
		.join('\n\n');

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
}): ClaudeToolDefinition[] {
	const supabase = createServerClient();
	const baseContext = { supabase, authUserId: params.authUserId };

	const createProgramTool: ClaudeToolDefinition = {
		name: 'create_program',
		description:
			'Persist a brand-new workout program for this user after enough onboarding details are collected.',
		inputSchema: {
			type: 'object',
			properties: {
				program: {
					type: 'object',
					description:
						'Complete Program JSON with id, name, description, startDate, schedule, and workouts. dayOfWeek is Monday-based: 0=Mon..6=Sun. You may also include dayName/workoutId/workoutName and they will be normalized.'
				},
				reason: {
					type: 'string',
					description: 'Short reason explaining why this program fits the user.'
				}
			},
			required: ['program']
		},
		execute: async (rawInput): Promise<AgentAction> => {
			const input = createProgramToolInputSchema.parse(rawInput);
			const appUserId = await ensureAppUserId(baseContext.supabase, baseContext.authUserId);
			const parsedProgram = normalizeProgramInput(input.program);

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

			const programId = inserted.id as string;
			const programVersionId = await getCurrentVersionId(baseContext.supabase, appUserId, programId);

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
					type: 'object',
					description:
						'Full updated Program JSON preserving IDs for unchanged workouts/exercises whenever possible. dayOfWeek is Monday-based: 0=Mon..6=Sun. You may include dayName/workoutId/workoutName aliases and they will be normalized.'
				},
				reason: {
					type: 'string',
					description: 'Short summary of what changed and why.'
				}
			},
			required: ['updatedProgram']
		},
		execute: async (rawInput): Promise<AgentAction> => {
			const input = modifyProgramToolInputSchema.parse(rawInput);
			const appUserId = await ensureAppUserId(baseContext.supabase, baseContext.authUserId);
			const targetProgramId = input.programId ?? params.conversationProgramId;
			if (!targetProgramId) {
				throw new Error('No programId provided for modify_program');
			}

			const currentProgram = await getOwnedProgram(baseContext.supabase, appUserId, targetProgramId);
			const rawUpdatedProgram = input.updatedProgram ?? input.program;
			if (!rawUpdatedProgram) {
				throw new Error('modify_program requires updatedProgram');
			}

			const parsedUpdatedProgram = normalizeProgramInput(rawUpdatedProgram, currentProgram.id);
			const mergedProgram = preserveProgramIdentity(currentProgram, parsedUpdatedProgram);
			assertProgramInvariants(mergedProgram);
			const changeSet = buildProgramChangeSet(currentProgram, mergedProgram);
			const previousVersionId = currentProgram.currentVersionId;

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

			const programVersionId = await getCurrentVersionId(
				baseContext.supabase,
				appUserId,
				currentProgram.id
			);

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
