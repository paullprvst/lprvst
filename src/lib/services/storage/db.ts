import Dexie, { type Table } from 'dexie';
import type { User } from '$lib/types/user';
import type { Conversation } from '$lib/types/conversation';
import type { Program } from '$lib/types/program';
import type { WorkoutSession } from '$lib/types/workout-session';

export class FitnessDatabase extends Dexie {
	users!: Table<User>;
	conversations!: Table<Conversation>;
	programs!: Table<Program>;
	workoutSessions!: Table<WorkoutSession>;

	constructor() {
		super('FitnessCoachDB');
		this.version(1).stores({
			users: 'id, createdAt, updatedAt',
			conversations: 'id, type, status, userId, programId, createdAt, updatedAt',
			programs: 'id, startDate, createdAt, updatedAt',
			workoutSessions: 'id, workoutId, programId, startedAt, completedAt, status'
		});
	}
}

export const db = new FitnessDatabase();
