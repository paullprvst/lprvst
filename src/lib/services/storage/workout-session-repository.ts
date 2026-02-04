import { supabase } from './supabase';
import { getAppUserId } from '$lib/stores/auth-store.svelte';
import type { WorkoutSession, ExerciseLog, SetLog, ExerciseWithLastPerformance } from '$lib/types/workout-session';
import { programRepository } from './program-repository';

export class WorkoutSessionRepository {
	async create(session: Omit<WorkoutSession, 'id' | 'startedAt'>): Promise<WorkoutSession> {
		const userId = await getAppUserId();
		if (!userId) {
			throw new Error('User must be authenticated to create a workout session');
		}

		const { data, error } = await supabase
			.from('workout_sessions')
			.insert({
				user_id: userId,
				workout_id: session.workoutId,
				program_id: session.programId,
				status: session.status,
				exercises: session.exercises
			})
			.select()
			.single();

		if (error) throw error;
		return this.mapFromDb(data);
	}

	async get(id: string): Promise<WorkoutSession | undefined> {
		const { data, error } = await supabase.from('workout_sessions').select().eq('id', id).single();

		if (error) {
			if (error.code === 'PGRST116') return undefined;
			throw error;
		}
		return this.mapFromDb(data);
	}

	async getByProgram(programId: string): Promise<WorkoutSession[]> {
		const { data, error } = await supabase
			.from('workout_sessions')
			.select()
			.eq('program_id', programId)
			.order('started_at', { ascending: false });

		if (error) throw error;
		return (data || []).map((row) => this.mapFromDb(row));
	}

	async getCompleted(): Promise<WorkoutSession[]> {
		const { data, error } = await supabase
			.from('workout_sessions')
			.select()
			.eq('status', 'completed')
			.order('completed_at', { ascending: false });

		if (error) throw error;
		return (data || []).map((row) => this.mapFromDb(row));
	}

	async getInProgress(): Promise<WorkoutSession[]> {
		// Only return sessions started within the last 24 hours
		const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
		const { data, error } = await supabase
			.from('workout_sessions')
			.select()
			.eq('status', 'in-progress')
			.gte('started_at', cutoff)
			.order('started_at', { ascending: false });

		if (error) throw error;
		return (data || []).map((row) => this.mapFromDb(row));
	}

	async getCompletedByDateRange(startDate: Date, endDate: Date): Promise<WorkoutSession[]> {
		const { data, error } = await supabase
			.from('workout_sessions')
			.select()
			.eq('status', 'completed')
			.gte('completed_at', startDate.toISOString())
			.lte('completed_at', endDate.toISOString())
			.order('completed_at', { ascending: false });

		if (error) throw error;
		return (data || []).map((row) => this.mapFromDb(row));
	}

	async update(id: string, updates: Partial<WorkoutSession>): Promise<void> {
		const dbUpdates: Record<string, unknown> = {};
		if (updates.workoutId !== undefined) dbUpdates.workout_id = updates.workoutId;
		if (updates.programId !== undefined) dbUpdates.program_id = updates.programId;
		if (updates.status !== undefined) dbUpdates.status = updates.status;
		if (updates.exercises !== undefined) dbUpdates.exercises = updates.exercises;
		if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;

		const { error } = await supabase.from('workout_sessions').update(dbUpdates).eq('id', id);

		if (error) throw error;
	}

	async complete(id: string): Promise<void> {
		const { error } = await supabase
			.from('workout_sessions')
			.update({
				status: 'completed',
				completed_at: new Date().toISOString()
			})
			.eq('id', id);

		if (error) throw error;
	}

	async delete(id: string): Promise<void> {
		const { error } = await supabase.from('workout_sessions').delete().eq('id', id);
		if (error) throw error;
	}

	async getAllExercisesWithLastPerformance(): Promise<ExerciseWithLastPerformance[]> {
		// Get all completed sessions
		const sessions = await this.getCompleted();
		if (sessions.length === 0) return [];

		// Get all programs to map exercise IDs to names
		const programs = await programRepository.getAll();
		const exerciseNameMap = new Map<string, string>();
		for (const program of programs) {
			for (const workout of program.workouts) {
				for (const exercise of workout.exercises) {
					if (!exerciseNameMap.has(exercise.id)) {
						exerciseNameMap.set(exercise.id, exercise.name);
					}
				}
			}
		}

		// Group by exercise ID, keeping track of the most recent performance
		const exerciseMap = new Map<string, { lastPerformedAt: Date; lastSets: SetLog[] }>();

		for (const session of sessions) {
			const sessionDate = session.completedAt || session.startedAt;
			for (const exerciseLog of session.exercises) {
				if (exerciseLog.skipped) continue;
				const completedSets = exerciseLog.sets.filter(s => s.completed);
				if (completedSets.length === 0) continue;

				const existing = exerciseMap.get(exerciseLog.exerciseId);
				if (!existing || sessionDate > existing.lastPerformedAt) {
					exerciseMap.set(exerciseLog.exerciseId, {
						lastPerformedAt: sessionDate,
						lastSets: completedSets
					});
				}
			}
		}

		// Convert to array and add exercise names
		const result: ExerciseWithLastPerformance[] = [];
		for (const [exerciseId, data] of exerciseMap) {
			const exerciseName = exerciseNameMap.get(exerciseId);
			if (exerciseName) {
				result.push({
					exerciseId,
					exerciseName,
					lastPerformedAt: data.lastPerformedAt,
					lastSets: data.lastSets
				});
			}
		}

		// Sort by most recently performed
		result.sort((a, b) => b.lastPerformedAt.getTime() - a.lastPerformedAt.getTime());

		return result;
	}

	async getLastPerformanceForExercise(exerciseId: string): Promise<ExerciseLog | null> {
		// Get all completed sessions sorted by completion date (most recent first)
		const sessions = await this.getCompleted();

		for (const session of sessions) {
			const exerciseLog = session.exercises.find(e => e.exerciseId === exerciseId);
			if (exerciseLog && !exerciseLog.skipped) {
				const completedSets = exerciseLog.sets.filter(s => s.completed);
				if (completedSets.length > 0) {
					return exerciseLog;
				}
			}
		}

		return null;
	}

	async getLastPerformanceByName(exerciseName: string): Promise<ExerciseLog | null> {
		const sessions = await this.getCompleted();
		const normalizedName = exerciseName.toLowerCase().trim();

		for (const session of sessions) {
			const exerciseLog = session.exercises.find(
				e => e.exerciseName?.toLowerCase().trim() === normalizedName
			);
			if (exerciseLog && !exerciseLog.skipped) {
				const completedSets = exerciseLog.sets.filter(s => s.completed);
				if (completedSets.length > 0) {
					return exerciseLog;
				}
			}
		}
		return null;
	}

	private mapFromDb(data: Record<string, unknown>): WorkoutSession {
		const exercises = (data.exercises as Array<Record<string, unknown>>) || [];
		return {
			id: data.id as string,
			userId: data.user_id as string | undefined,
			workoutId: data.workout_id as string,
			programId: data.program_id as string,
			startedAt: new Date(data.started_at as string),
			completedAt: data.completed_at ? new Date(data.completed_at as string) : undefined,
			status: data.status as WorkoutSession['status'],
			exercises: exercises.map((e) => ({
				exerciseId: e.exerciseId as string,
				exerciseName: (e.exerciseName as string) || '',
				sets: (e.sets as Array<Record<string, unknown>>).map((s) => ({
					setNumber: s.setNumber as number,
					completed: s.completed as boolean,
					reps: s.reps as number | undefined,
					weight: s.weight as number | undefined,
					duration: s.duration as number | undefined,
					completedAt: s.completedAt ? new Date(s.completedAt as string) : undefined
				})) as SetLog[],
				notes: e.notes as string | undefined,
				skipped: e.skipped as boolean | undefined
			})) as ExerciseLog[]
		};
	}
}

export const workoutSessionRepository = new WorkoutSessionRepository();
