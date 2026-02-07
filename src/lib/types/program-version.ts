import type { MuscleTarget, ProgramSchedule, Workout, Exercise } from './program';

export interface ProgramVersion {
	id: string;
	programId: string;
	versionNumber: number;
	source: 'initial_import' | 'generated' | 'modified' | 'manual';
	name: string;
	description: string;
	startDate: Date;
	workouts: ProgramVersionWorkout[];
	schedule: ProgramVersionSchedule[];
	createdAt: Date;
}

export interface ProgramVersionWorkout {
	id: string;
	programVersionId: string;
	sourceWorkoutId: string;
	position: number;
	name: Workout['name'];
	type: Workout['type'];
	estimatedDuration: number;
	notes?: string;
	exercises: ProgramVersionExercise[];
}

export interface ProgramVersionExercise {
	id: string;
	workoutVersionId: string;
	sourceExerciseId: string;
	position: number;
	name: Exercise['name'];
	sets: number;
	reps?: string;
	duration?: number;
	restBetweenSets: number;
	restBetweenExercises: number;
	equipment: string[];
	notes?: string;
	type: Exercise['type'];
	targetMuscles?: MuscleTarget[];
}

export interface ProgramVersionSchedule {
	id: string;
	programVersionId: string;
	dayOfWeek: number;
	workoutIndex: number;
	workoutVersionId?: string;
}

export interface ProgramVersionProjection {
	name: string;
	description: string;
	startDate: Date;
	schedule: ProgramSchedule;
	workouts: Workout[];
}
