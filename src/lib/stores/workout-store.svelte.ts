import type { WorkoutSession } from '$lib/types/workout-session';
import type { Workout } from '$lib/types/program';

class WorkoutStore {
	session = $state<WorkoutSession | null>(null);
	workout = $state<Workout | null>(null);
	currentExerciseIndex = $state(0);
	resting = $state(false);
	restDuration = $state(0);

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
		if (!this.session || !this.currentExerciseLog) return;

		const set = this.currentExerciseLog.sets.find(s => s.setNumber === setNumber);
		if (set) {
			set.completed = true;
			set.completedAt = new Date();

			// Check if all sets are completed
			const allCompleted = this.currentExerciseLog.sets.every(s => s.completed);
			if (allCompleted && this.currentExercise && this.currentExercise.restTime > 0 && !this.isLastExercise) {
				this.startRest(this.currentExercise.restTime);
			}
		}
	}

	startRest(duration: number) {
		this.resting = true;
		this.restDuration = duration;
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
	}
}

export const workoutStore = new WorkoutStore();
