export interface WorkoutSession {
	id: string;
	userId?: string;
	workoutId: string;
	programId: string;
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
