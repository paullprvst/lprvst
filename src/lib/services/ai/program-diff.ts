import type { Program, Workout, Exercise, WeeklyPattern } from '$lib/types/program';
import type { ProgramChange } from '$lib/types/agent';

function toISODate(value: Date): string {
	return value.toISOString().slice(0, 10);
}

function isEqual(left: unknown, right: unknown): boolean {
	return JSON.stringify(left) === JSON.stringify(right);
}

function pushChange(
	changes: ProgramChange[],
	change: Omit<ProgramChange, 'op'> & {
		before?: unknown;
		after?: unknown;
	}
): void {
	if (change.before === undefined && change.after === undefined) return;
	if (isEqual(change.before, change.after)) return;

	changes.push({
		op:
			change.before === undefined
				? 'add'
				: change.after === undefined
					? 'remove'
					: 'replace',
		...change
	});
}

function diffSchedule(before: WeeklyPattern[], after: WeeklyPattern[], changes: ProgramChange[]): void {
	const beforeByDay = new Map(before.map((item) => [item.dayOfWeek, item.workoutIndex]));
	const afterByDay = new Map(after.map((item) => [item.dayOfWeek, item.workoutIndex]));
	const days = new Set<number>([...beforeByDay.keys(), ...afterByDay.keys()]);

	for (const dayOfWeek of [...days].sort((a, b) => a - b)) {
		pushChange(changes, {
			entityType: 'schedule',
			entityId: `day:${dayOfWeek}`,
			field: 'workoutIndex',
			before: beforeByDay.get(dayOfWeek),
			after: afterByDay.get(dayOfWeek)
		});
	}
}

function diffExercises(before: Workout, after: Workout, changes: ProgramChange[]): void {
	const beforeExercises = new Map(before.exercises.map((exercise) => [exercise.id, exercise]));
	const afterExercises = new Map(after.exercises.map((exercise) => [exercise.id, exercise]));
	const exerciseIds = new Set<string>([...beforeExercises.keys(), ...afterExercises.keys()]);

	for (const exerciseId of exerciseIds) {
		const beforeExercise = beforeExercises.get(exerciseId);
		const afterExercise = afterExercises.get(exerciseId);
		if (!beforeExercise || !afterExercise) {
			pushChange(changes, {
				entityType: 'exercise',
				entityId: exerciseId,
				field: 'exercise',
				before: beforeExercise,
				after: afterExercise
			});
			continue;
		}

		diffExerciseFields(beforeExercise, afterExercise, changes);
	}
}

function diffExerciseFields(before: Exercise, after: Exercise, changes: ProgramChange[]): void {
	const fields: Array<keyof Exercise> = [
		'name',
		'sets',
		'reps',
		'duration',
		'restBetweenSets',
		'restBetweenExercises',
		'equipment',
		'notes',
		'type',
		'targetMuscles'
	];

	for (const field of fields) {
		pushChange(changes, {
			entityType: 'exercise',
			entityId: before.id,
			field,
			before: before[field],
			after: after[field]
		});
	}
}

function diffWorkouts(before: Program, after: Program, changes: ProgramChange[]): void {
	const beforeWorkouts = new Map(before.workouts.map((workout) => [workout.id, workout]));
	const afterWorkouts = new Map(after.workouts.map((workout) => [workout.id, workout]));
	const workoutIds = new Set<string>([...beforeWorkouts.keys(), ...afterWorkouts.keys()]);

	for (const workoutId of workoutIds) {
		const beforeWorkout = beforeWorkouts.get(workoutId);
		const afterWorkout = afterWorkouts.get(workoutId);
		if (!beforeWorkout || !afterWorkout) {
			pushChange(changes, {
				entityType: 'workout',
				entityId: workoutId,
				field: 'workout',
				before: beforeWorkout,
				after: afterWorkout
			});
			continue;
		}

		const workoutFields: Array<keyof Workout> = ['name', 'type', 'estimatedDuration', 'notes'];
		for (const field of workoutFields) {
			pushChange(changes, {
				entityType: 'workout',
				entityId: workoutId,
				field,
				before: beforeWorkout[field],
				after: afterWorkout[field]
			});
		}

		diffExercises(beforeWorkout, afterWorkout, changes);
	}
}

export function buildProgramChangeSet(before: Program, after: Program): ProgramChange[] {
	const changes: ProgramChange[] = [];

	pushChange(changes, {
		entityType: 'program',
		entityId: before.id,
		field: 'name',
		before: before.name,
		after: after.name
	});
	pushChange(changes, {
		entityType: 'program',
		entityId: before.id,
		field: 'description',
		before: before.description,
		after: after.description
	});
	pushChange(changes, {
		entityType: 'program',
		entityId: before.id,
		field: 'startDate',
		before: toISODate(before.startDate),
		after: toISODate(after.startDate)
	});
	pushChange(changes, {
		entityType: 'program',
		entityId: before.id,
		field: 'duration',
		before: before.schedule.duration,
		after: after.schedule.duration
	});

	diffSchedule(before.schedule.weeklyPattern, after.schedule.weeklyPattern, changes);
	diffWorkouts(before, after, changes);

	return changes;
}
