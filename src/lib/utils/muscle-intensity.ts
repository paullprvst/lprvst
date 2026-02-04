import type { Workout, MuscleGroup, MuscleTarget } from '$lib/types/program';
import { MUSCLE_GROUPS } from '$lib/types/program';
import { getTargetMuscles } from './exercise-muscle-map';

export type IntensityLevel = 'none' | 'low' | 'medium' | 'high';

export interface MuscleIntensity {
	muscle: MuscleGroup;
	level: IntensityLevel;
	score: number;
	exercises: string[];
}

export type MuscleIntensityMap = Map<MuscleGroup, MuscleIntensity>;

// Activation weights for score calculation
const ACTIVATION_WEIGHTS: Record<string, number> = {
	primary: 1.0,
	secondary: 0.5,
	stabilizer: 0.25
};

// Workout types that contribute to muscle intensity (excludes mobility/flexibility)
const COUNTED_WORKOUT_TYPES = new Set(['strength', 'mixed', 'cardio']);

// Exercise types that contribute to muscle intensity (excludes warmup/cooldown)
const COUNTED_EXERCISE_TYPES = new Set(['main']);

/**
 * Calculate muscle intensity scores for a single workout
 */
export function calculateWorkoutIntensity(workout: Workout): MuscleIntensityMap {
	const scores = new Map<MuscleGroup, { score: number; exercises: Set<string> }>();

	// Initialize all muscles with zero score
	for (const muscle of MUSCLE_GROUPS) {
		scores.set(muscle, { score: 0, exercises: new Set() });
	}

	// Skip mobility/flexibility workouts entirely
	if (!COUNTED_WORKOUT_TYPES.has(workout.type)) {
		return normalizeToIntensityLevels(scores);
	}

	// Calculate scores from main exercises only (skip warmup/cooldown)
	for (const exercise of workout.exercises) {
		if (!COUNTED_EXERCISE_TYPES.has(exercise.type)) continue;

		const targetMuscles = getTargetMuscles(exercise.name, exercise.targetMuscles);
		if (!targetMuscles) continue;

		for (const target of targetMuscles) {
			const activationWeight = ACTIVATION_WEIGHTS[target.activation] ?? 0.5;
			const score = exercise.sets * activationWeight;

			const current = scores.get(target.muscle)!;
			current.score += score;
			current.exercises.add(exercise.name);
		}
	}

	return normalizeToIntensityLevels(scores);
}

/**
 * Calculate aggregated muscle intensity across all workouts in a program
 */
export function calculateProgramIntensity(workouts: Workout[]): MuscleIntensityMap {
	const scores = new Map<MuscleGroup, { score: number; exercises: Set<string> }>();

	// Initialize all muscles with zero score
	for (const muscle of MUSCLE_GROUPS) {
		scores.set(muscle, { score: 0, exercises: new Set() });
	}

	// Aggregate scores from strength/mixed/cardio workouts only
	for (const workout of workouts) {
		if (!COUNTED_WORKOUT_TYPES.has(workout.type)) continue;

		for (const exercise of workout.exercises) {
			// Skip warmup/cooldown exercises
			if (!COUNTED_EXERCISE_TYPES.has(exercise.type)) continue;

			const targetMuscles = getTargetMuscles(exercise.name, exercise.targetMuscles);
			if (!targetMuscles) continue;

			for (const target of targetMuscles) {
				const activationWeight = ACTIVATION_WEIGHTS[target.activation] ?? 0.5;
				const score = exercise.sets * activationWeight;

				const current = scores.get(target.muscle)!;
				current.score += score;
				current.exercises.add(exercise.name);
			}
		}
	}

	return normalizeToIntensityLevels(scores);
}

/**
 * Normalize raw scores to 3 intensity levels using percentile thresholds
 */
function normalizeToIntensityLevels(
	scores: Map<MuscleGroup, { score: number; exercises: Set<string> }>
): MuscleIntensityMap {
	// Get all non-zero scores for percentile calculation
	const nonZeroScores = Array.from(scores.values())
		.map((v) => v.score)
		.filter((s) => s > 0)
		.sort((a, b) => a - b);

	// If no muscles are targeted, return all as 'none'
	if (nonZeroScores.length === 0) {
		const result: MuscleIntensityMap = new Map();
		for (const muscle of MUSCLE_GROUPS) {
			result.set(muscle, { muscle, level: 'none', score: 0, exercises: [] });
		}
		return result;
	}

	// Calculate percentile thresholds
	const p33Index = Math.floor(nonZeroScores.length * 0.33);
	const p66Index = Math.floor(nonZeroScores.length * 0.66);
	const lowThreshold = nonZeroScores[p33Index] ?? nonZeroScores[0];
	const mediumThreshold = nonZeroScores[p66Index] ?? nonZeroScores[nonZeroScores.length - 1];

	const result: MuscleIntensityMap = new Map();

	for (const [muscle, data] of scores) {
		let level: IntensityLevel;

		if (data.score === 0) {
			level = 'none';
		} else if (data.score <= lowThreshold) {
			level = 'low';
		} else if (data.score <= mediumThreshold) {
			level = 'medium';
		} else {
			level = 'high';
		}

		result.set(muscle, {
			muscle,
			level,
			score: data.score,
			exercises: Array.from(data.exercises)
		});
	}

	return result;
}

/**
 * Check if any main exercises in strength/mixed/cardio workouts have targetMuscles data
 */
export function hasMuscleData(workouts: Workout[]): boolean {
	return workouts
		.filter((workout) => COUNTED_WORKOUT_TYPES.has(workout.type))
		.some((workout) =>
			workout.exercises
				.filter((exercise) => COUNTED_EXERCISE_TYPES.has(exercise.type))
				.some((exercise) => {
					const targets = getTargetMuscles(exercise.name, exercise.targetMuscles);
					return targets && targets.length > 0;
				})
		);
}

/**
 * Get opacity value for an intensity level
 */
export function getIntensityOpacity(level: IntensityLevel): number {
	switch (level) {
		case 'low':
			return 0.3;
		case 'medium':
			return 0.6;
		case 'high':
			return 1.0;
		default:
			return 0;
	}
}
