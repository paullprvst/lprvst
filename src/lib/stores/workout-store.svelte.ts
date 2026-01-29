import type { WorkoutSession } from '$lib/types/workout-session';
import type { Workout } from '$lib/types/program';

// Default transition time between sets for time-based exercises when no rest is specified
const DEFAULT_TRANSITION_TIME = 10;

// Parse time duration from reps string (e.g., "2 minutes", "30 seconds", "90 sec")
function parseTimeDuration(reps?: string): number | null {
	if (!reps) return null;

	const minuteMatch = reps.match(/(\d+\.?\d*)\s*(minutes?|min|m)\b/i);
	if (minuteMatch) {
		return Math.round(parseFloat(minuteMatch[1]) * 60);
	}

	const secondMatch = reps.match(/(\d+\.?\d*)\s*(seconds?|sec|s)\b/i);
	if (secondMatch) {
		return Math.round(parseFloat(secondMatch[1]));
	}

	return null;
}

class WorkoutStore {
	session = $state<WorkoutSession | null>(null);
	workout = $state<Workout | null>(null);
	currentExerciseIndex = $state(0);
	resting = $state(false);
	restDuration = $state(0);
	restType = $state<'set' | 'exercise'>('set');

	setSession(session: WorkoutSession, workout: Workout) {
		this.session = session;
		this.workout = workout;
		this.currentExerciseIndex = 0;
		this.resting = false;
	}

	get currentExercise() {
		if (!this.workout) return null;
		return this.workout.exercises[this.currentExerciseIndex];
	}

	get currentExerciseLog() {
		if (!this.session || !this.currentExercise) return null;
		return this.session.exercises.find(e => e.exerciseId === this.currentExercise!.id);
	}

	get progress() {
		if (!this.workout) return 0;
		return Math.round((this.currentExerciseIndex / this.workout.exercises.length) * 100);
	}

	get isLastExercise() {
		if (!this.workout) return false;
		return this.currentExerciseIndex === this.workout.exercises.length - 1;
	}

	get upcomingExercise() {
		if (!this.workout || this.isLastExercise) return null;
		return this.workout.exercises[this.currentExerciseIndex + 1];
	}

	completeSet(setNumber: number, data?: { reps?: number; weight?: number; duration?: number }) {
		if (!this.session || !this.currentExerciseLog || !this.currentExercise) return;

		const set = this.currentExerciseLog.sets.find(s => s.setNumber === setNumber);
		if (set && !set.completed) {
			set.completed = true;
			set.completedAt = new Date();
			if (data?.reps !== undefined) set.reps = data.reps;
			if (data?.weight !== undefined) set.weight = data.weight;
			if (data?.duration !== undefined) set.duration = data.duration;

			// Check if all sets are completed
			const allCompleted = this.currentExerciseLog.sets.every(s => s.completed);

			// Check if this is a time-based exercise
			const effectiveDuration = this.currentExercise.duration || parseTimeDuration(this.currentExercise.reps);
			const isTimeBased = effectiveDuration && effectiveDuration > 0;

			if (allCompleted) {
				// All sets done - show rest before next exercise (if not last exercise)
				if (this.currentExercise.restBetweenExercises > 0 && !this.isLastExercise) {
					this.startRest(this.currentExercise.restBetweenExercises, 'exercise');
				}
			} else if (this.currentExercise.restBetweenSets > 0) {
				// More sets to do - show rest between sets
				this.startRest(this.currentExercise.restBetweenSets, 'set');
			} else if (isTimeBased) {
				// Time-based exercise with no rest specified - add default transition time
				this.startRest(DEFAULT_TRANSITION_TIME, 'set');
			}
		}
	}

	startRest(duration: number, type: 'set' | 'exercise' = 'set') {
		this.resting = true;
		this.restDuration = duration;
		this.restType = type;
	}

	completeRest() {
		this.resting = false;
		this.restDuration = 0;
	}

	updateSetData(setNumber: number, data: { reps?: number; weight?: number; duration?: number }) {
		if (!this.currentExerciseLog) return;
		const set = this.currentExerciseLog.sets.find(s => s.setNumber === setNumber);
		if (set) {
			if (data.reps !== undefined) set.reps = data.reps;
			if (data.weight !== undefined) set.weight = data.weight;
			if (data.duration !== undefined) set.duration = data.duration;
		}
	}

	nextExercise() {
		if (!this.workout) return;
		if (this.currentExerciseIndex < this.workout.exercises.length - 1) {
			this.currentExerciseIndex++;
		}
	}

	clear() {
		this.session = null;
		this.workout = null;
		this.currentExerciseIndex = 0;
		this.resting = false;
		this.restDuration = 0;
		this.restType = 'set';
	}
}

export const workoutStore = new WorkoutStore();
