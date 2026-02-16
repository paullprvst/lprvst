export interface WorkoutSession {
	id: string;
	userId?: string;
	workoutId: string;
	workoutNameSnapshot?: string;
	programId?: string;
	programVersionId?: string;
	workoutVersionId?: string;
	startedAt: Date;
	completedAt?: Date;
	status: 'in-progress' | 'completed' | 'abandoned';
	exercises: ExerciseLog[];
}

export interface ExerciseLog {
	exerciseId: string;
	exerciseName: string;
	sets: SetLog[];
	notes?: string;
	skipped?: boolean;
}

export interface SetLog {
	setNumber: number;
	completed: boolean;
	reps?: number;
	weight?: number;
	duration?: number;
	completedAt?: Date;
}

export interface ExerciseWithLastPerformance {
	exerciseId: string;
	exerciseName: string;
	lastPerformedAt: Date;
	lastSets: SetLog[];
}

export interface ExerciseHistoryEntry {
	sessionId: string;
	exerciseId: string;
	exerciseName: string;
	performedAt: Date;
	programId?: string;
	workoutId: string;
	workoutNameSnapshot?: string;
	sets: SetLog[];
	notes?: string;
	skipped?: boolean;
}
