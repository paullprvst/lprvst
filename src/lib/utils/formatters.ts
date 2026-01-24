export function formatExerciseReps(reps?: string, duration?: number): string {
	if (duration) {
		return `${duration}s`;
	}
	return reps || '';
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
