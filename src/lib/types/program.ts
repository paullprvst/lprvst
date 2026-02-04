import { z } from 'zod';

// 20 muscle groups for visualization
export const MUSCLE_GROUPS = [
	// Front view (10)
	'chest',
	'shoulders_front',
	'biceps',
	'forearms',
	'abs',
	'obliques',
	'hip_flexors',
	'quads',
	'inner_thighs',
	'tibialis',
	// Back view (10)
	'traps',
	'shoulders_rear',
	'lats',
	'rhomboids',
	'lower_back',
	'triceps',
	'glutes',
	'hamstrings',
	'calves'
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export type MuscleActivation = 'primary' | 'secondary' | 'stabilizer';

export interface MuscleTarget {
	muscle: MuscleGroup;
	activation: MuscleActivation;
}

export interface Program {
	id: string;
	userId?: string;
	name: string;
	description: string;
	startDate: Date;
	schedule: ProgramSchedule;
	workouts: Workout[];
	createdAt: Date;
	updatedAt: Date;
}

export interface ProgramSchedule {
	weeklyPattern: WeeklyPattern[];
	duration?: number;
}

export interface WeeklyPattern {
	dayOfWeek: number;
	workoutIndex: number;
}

export interface Workout {
	id: string;
	name: string;
	type: 'strength' | 'cardio' | 'flexibility' | 'mobility' | 'mixed';
	estimatedDuration: number;
	exercises: Exercise[];
	notes?: string;
}

export interface Exercise {
	id: string;
	name: string;
	sets: number;
	reps?: string;
	duration?: number;
	restBetweenSets: number;
	restBetweenExercises: number;
	equipment?: string[];
	notes?: string;
	type: 'warmup' | 'main' | 'cooldown';
	targetMuscles?: MuscleTarget[];
}

// Zod schemas for validation
export const MuscleGroupSchema = z.enum([
	'chest',
	'shoulders_front',
	'biceps',
	'forearms',
	'abs',
	'obliques',
	'hip_flexors',
	'quads',
	'inner_thighs',
	'tibialis',
	'traps',
	'shoulders_rear',
	'lats',
	'rhomboids',
	'lower_back',
	'triceps',
	'glutes',
	'hamstrings',
	'calves'
]);

export const MuscleActivationSchema = z.enum(['primary', 'secondary', 'stabilizer']);

export const MuscleTargetSchema = z.object({
	muscle: MuscleGroupSchema,
	activation: MuscleActivationSchema
});

export const ExerciseSchema = z.object({
	id: z.string(),
	name: z.string(),
	sets: z.number(),
	reps: z.string().optional(),
	duration: z.number().optional(),
	restBetweenSets: z.number(),
	restBetweenExercises: z.number(),
	equipment: z.array(z.string()).optional(),
	notes: z.string().optional(),
	type: z.enum(['warmup', 'main', 'cooldown']),
	targetMuscles: z.array(MuscleTargetSchema).optional()
});

export const WorkoutSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.enum(['strength', 'cardio', 'flexibility', 'mobility', 'mixed']),
	estimatedDuration: z.number(),
	exercises: z.array(ExerciseSchema),
	notes: z.string().optional()
});

export const WeeklyPatternSchema = z.object({
	dayOfWeek: z.number().min(0).max(6),
	workoutIndex: z.number()
});

export const ProgramScheduleSchema = z.object({
	weeklyPattern: z.array(WeeklyPatternSchema),
	duration: z.number().optional()
});

export const ProgramSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	startDate: z.string().or(z.date()),
	schedule: ProgramScheduleSchema,
	workouts: z.array(WorkoutSchema),
	createdAt: z.string().or(z.date()).optional(),
	updatedAt: z.string().or(z.date()).optional()
});
