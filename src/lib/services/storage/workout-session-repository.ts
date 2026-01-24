import { db } from './db';
import type { WorkoutSession } from '$lib/types/workout-session';

export class WorkoutSessionRepository {
	async create(
		session: Omit<WorkoutSession, 'id' | 'startedAt'>
	): Promise<WorkoutSession> {
		const newSession: WorkoutSession = {
			...session,
			id: crypto.randomUUID(),
			startedAt: new Date()
		};
		await db.workoutSessions.add(newSession);
		return newSession;
	}

	async get(id: string): Promise<WorkoutSession | undefined> {
		return await db.workoutSessions.get(id);
	}

	async getByProgram(programId: string): Promise<WorkoutSession[]> {
		return await db.workoutSessions
			.where('programId')
			.equals(programId)
			.reverse()
			.sortBy('startedAt');
	}

	async getCompleted(): Promise<WorkoutSession[]> {
		return await db.workoutSessions
			.where('status')
			.equals('completed')
			.reverse()
			.sortBy('completedAt');
	}

	async update(id: string, updates: Partial<WorkoutSession>): Promise<void> {
		await db.workoutSessions.update(id, updates);
	}

	async complete(id: string): Promise<void> {
		await db.workoutSessions.update(id, {
			status: 'completed',
			completedAt: new Date()
		});
	}

	async delete(id: string): Promise<void> {
		await db.workoutSessions.delete(id);
	}
}

export const workoutSessionRepository = new WorkoutSessionRepository();
