import { z } from 'zod';

export interface Program {
	id: string;
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
	type: 'strength' | 'cardio' | 'flexibility' | 'mixed';
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
	restTime: number;
	equipment?: string[];
	notes?: string;
	type: 'warmup' | 'main' | 'cooldown';
}

// Zod schemas for validation
export const ExerciseSchema = z.object({
	id: z.string(),
	name: z.string(),
	sets: z.number(),
	reps: z.string().optional(),
	duration: z.number().optional(),
	restTime: z.number(),
	equipment: z.array(z.string()).optional(),
	notes: z.string().optional(),
	type: z.enum(['warmup', 'main', 'cooldown'])
});

export const WorkoutSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.enum(['strength', 'cardio', 'flexibility', 'mixed']),
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
