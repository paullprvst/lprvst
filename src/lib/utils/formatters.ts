import type { Exercise } from '$lib/types/program';
import type { ExerciseLog, SetLog, WorkoutSession } from '$lib/types/workout-session';

export function parseExerciseDuration(reps?: string): number | undefined {
	if (!reps) return undefined;

	const minuteMatch = reps.match(/(\d+\.?\d*)\s*(minutes?|min|m)\b/i);
	if (minuteMatch) {
		return Math.round(parseFloat(minuteMatch[1]) * 60);
	}

	const secondMatch = reps.match(/(\d+\.?\d*)\s*(seconds?|sec|s)\b/i);
	if (secondMatch) {
		return Math.round(parseFloat(secondMatch[1]));
	}

	return undefined;
}

export function getEffectiveExerciseDuration(
	exercise: Pick<Exercise, 'duration' | 'reps'> | { duration?: number; reps?: string }
): number | undefined {
	if (typeof exercise.duration === 'number' && Number.isFinite(exercise.duration) && exercise.duration > 0) {
		return exercise.duration;
	}

	return parseExerciseDuration(exercise.reps);
}

export function formatDurationSeconds(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds <= 0) return '';
	if (seconds < 60) {
		return `${seconds}s`;
	}

	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function formatExerciseReps(reps?: string, duration?: number): string {
	const effectiveDuration = getEffectiveExerciseDuration({ reps, duration });
	if (effectiveDuration) {
		return formatDurationSeconds(effectiveDuration);
	}

	return reps || '';
}

export function formatExerciseTarget(
	exercise: Pick<Exercise, 'sets' | 'reps' | 'duration'> | { sets: number; reps?: string; duration?: number }
): string {
	const target = formatExerciseReps(exercise.reps, exercise.duration);
	return target ? `${exercise.sets} × ${target}` : `${exercise.sets} sets`;
}

export function formatRestTime(seconds: number): string {
	if (seconds < 60) {
		return `${seconds}s rest`;
	}
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return secs > 0 ? `${mins}m ${secs}s rest` : `${mins}m rest`;
}

export function formatWorkoutDuration(minutes: number): string {
	if (minutes < 60) {
		return `${minutes} min`;
	}
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function formatSetPerformance(set: SetLog): string | null {
	if (set.reps !== undefined && set.weight !== undefined) {
		return `${set.reps}x${set.weight}kg`;
	}
	if (set.reps !== undefined) {
		return `${set.reps} reps`;
	}
	if (set.duration !== undefined) {
		return formatDurationSeconds(set.duration);
	}
	if (set.weight !== undefined) {
		return `${set.weight}kg`;
	}
	return null;
}

export function formatExercisePerformanceFull(exerciseLog: ExerciseLog): string {
	const completedSets = exerciseLog.sets.filter((set) => set.completed);
	if (completedSets.length === 0) return '';

	const renderedSets = completedSets.map(formatSetPerformance).filter((set): set is string => Boolean(set));
	if (renderedSets.length === 0) {
		return `${completedSets.length} sets`;
	}

	return renderedSets.join(', ');
}

export function getSessionDurationMinutes(session: WorkoutSession): number | null {
	const endTime = session.completedAt ?? null;
	if (!endTime) return null;

	const durationMinutes = Math.floor((endTime.getTime() - session.startedAt.getTime()) / 60_000);
	return durationMinutes > 0 ? durationMinutes : null;
}

export function resolveWorkoutDurationMinutes(
	aiEstimatedMinutes?: number,
	lastWorkoutMinutes?: number | null
): number | null {
	if (
		typeof aiEstimatedMinutes === 'number' &&
		Number.isFinite(aiEstimatedMinutes) &&
		aiEstimatedMinutes > 0
	) {
		return aiEstimatedMinutes;
	}

	if (
		typeof lastWorkoutMinutes === 'number' &&
		Number.isFinite(lastWorkoutMinutes) &&
		lastWorkoutMinutes > 0
	) {
		return lastWorkoutMinutes;
	}

	return null;
}
