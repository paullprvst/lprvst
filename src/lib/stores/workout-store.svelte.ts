import type { WorkoutSession } from '$lib/types/workout-session';
import type { Workout } from '$lib/types/program';

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

	completeSet(setNumber: number) {
		if (!this.session || !this.currentExerciseLog || !this.currentExercise) return;

		const set = this.currentExerciseLog.sets.find(s => s.setNumber === setNumber);
		if (set && !set.completed) {
			set.completed = true;
			set.completedAt = new Date();

			// Check if all sets are completed
			const allCompleted = this.currentExerciseLog.sets.every(s => s.completed);

			if (allCompleted) {
				// All sets done - show rest before next exercise (if not last exercise)
				if (this.currentExercise.restBetweenExercises > 0 && !this.isLastExercise) {
					this.startRest(this.currentExercise.restBetweenExercises, 'exercise');
				}
			} else if (this.currentExercise.restBetweenSets > 0) {
				// More sets to do - show rest between sets
				this.startRest(this.currentExercise.restBetweenSets, 'set');
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
