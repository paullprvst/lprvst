import type { Exercise, Program, Workout } from '$lib/types/program';

function normalizeName(value: string | undefined): string {
	return (value || '').trim().toLowerCase();
}

function getCandidateByName<T extends { id: string; name: string }>(
	index: Map<string, T[]>,
	name: string,
	usedIds: Set<string>
): T | undefined {
	const candidates = index.get(normalizeName(name)) || [];
	return candidates.find((candidate) => !usedIds.has(candidate.id));
}

function resolveUniqueId(candidateId: string | undefined, usedIds: Set<string>): string {
	const trimmed = candidateId?.trim();
	if (trimmed && !usedIds.has(trimmed)) {
		usedIds.add(trimmed);
		return trimmed;
	}

	let generated = crypto.randomUUID();
	while (usedIds.has(generated)) {
		generated = crypto.randomUUID();
	}
	usedIds.add(generated);
	return generated;
}

function buildNameIndex<T extends { name: string }>(items: T[]): Map<string, T[]> {
	const index = new Map<string, T[]>();
	for (const item of items) {
		const key = normalizeName(item.name);
		if (!key) continue;
		const list = index.get(key) || [];
		list.push(item);
		index.set(key, list);
	}
	return index;
}

function mergeExercises(
	existingWorkout: Workout | undefined,
	modifiedWorkout: Workout,
	globalExerciseIds: Set<string>
): Exercise[] {
	const existingExercises = existingWorkout?.exercises || [];
	const existingById = new Map(existingExercises.map((exercise) => [exercise.id, exercise]));
	const existingByName = buildNameIndex(existingExercises);
	const usedExistingExerciseIds = new Set<string>();

	return modifiedWorkout.exercises.map((exercise) => {
		let matchedExisting = existingById.get(exercise.id);

		if (!matchedExisting || usedExistingExerciseIds.has(matchedExisting.id)) {
			matchedExisting = getCandidateByName(existingByName, exercise.name, usedExistingExerciseIds);
		}

		if (matchedExisting) {
			usedExistingExerciseIds.add(matchedExisting.id);
		}

		const stableId = resolveUniqueId(matchedExisting?.id ?? exercise.id, globalExerciseIds);
		return {
			...exercise,
			id: stableId
		};
	});
}

export function preserveProgramIdentity(existingProgram: Program, modifiedProgram: Program): Program {
	const existingById = new Map(existingProgram.workouts.map((workout) => [workout.id, workout]));
	const existingByName = buildNameIndex(existingProgram.workouts);
	const usedExistingWorkoutIds = new Set<string>();
	const finalWorkoutIds = new Set<string>();
	const finalExerciseIds = new Set<string>();

	const workouts = modifiedProgram.workouts.map((workout) => {
		let matchedExisting = existingById.get(workout.id);
		if (!matchedExisting || usedExistingWorkoutIds.has(matchedExisting.id)) {
			matchedExisting = getCandidateByName(existingByName, workout.name, usedExistingWorkoutIds);
		}

		if (matchedExisting) {
			usedExistingWorkoutIds.add(matchedExisting.id);
		}

		const stableWorkoutId = resolveUniqueId(matchedExisting?.id ?? workout.id, finalWorkoutIds);
		return {
			...workout,
			id: stableWorkoutId,
			exercises: mergeExercises(matchedExisting, workout, finalExerciseIds)
		};
	});

	return {
		...modifiedProgram,
		id: existingProgram.id,
		createdAt: existingProgram.createdAt,
		updatedAt: new Date(),
		workouts
	};
}

export function validateProgramInvariants(program: Program): string[] {
	const errors: string[] = [];

	if (program.workouts.length === 0) {
		errors.push('Program must include at least one workout.');
	}

	const workoutIds = new Set<string>();
	for (let workoutIndex = 0; workoutIndex < program.workouts.length; workoutIndex++) {
		const workout = program.workouts[workoutIndex];
		if (!workout.name.trim()) {
			errors.push(`Workout ${workoutIndex + 1} is missing a name.`);
		}
		if (workout.estimatedDuration <= 0 || !Number.isFinite(workout.estimatedDuration)) {
			errors.push(`Workout "${workout.name || workout.id}" must have a positive estimatedDuration.`);
		}
		if (workoutIds.has(workout.id)) {
			errors.push(`Duplicate workout id "${workout.id}".`);
		}
		workoutIds.add(workout.id);

		if (workout.exercises.length === 0) {
			errors.push(`Workout "${workout.name || workout.id}" must include at least one exercise.`);
		}
	}

	const dayOfWeekSet = new Set<number>();
	for (const pattern of program.schedule.weeklyPattern) {
		if (dayOfWeekSet.has(pattern.dayOfWeek)) {
			errors.push(`Duplicate schedule dayOfWeek "${pattern.dayOfWeek}".`);
		}
		dayOfWeekSet.add(pattern.dayOfWeek);

		if (pattern.workoutIndex < 0 || pattern.workoutIndex >= program.workouts.length) {
			errors.push(`Schedule references invalid workoutIndex "${pattern.workoutIndex}".`);
		}
	}

	const exerciseIds = new Set<string>();
	for (const workout of program.workouts) {
		for (let exerciseIndex = 0; exerciseIndex < workout.exercises.length; exerciseIndex++) {
			const exercise = workout.exercises[exerciseIndex];
			if (!exercise.name.trim()) {
				errors.push(
					`Exercise ${exerciseIndex + 1} in workout "${workout.name || workout.id}" is missing a name.`
				);
			}
			if (!Number.isInteger(exercise.sets) || exercise.sets < 1) {
				errors.push(
					`Exercise "${exercise.name || exercise.id}" in workout "${workout.name || workout.id}" must have sets >= 1.`
				);
			}
			if (exercise.restBetweenSets < 0 || !Number.isFinite(exercise.restBetweenSets)) {
				errors.push(`Exercise "${exercise.name || exercise.id}" has invalid restBetweenSets.`);
			}
			if (exercise.restBetweenExercises < 0 || !Number.isFinite(exercise.restBetweenExercises)) {
				errors.push(`Exercise "${exercise.name || exercise.id}" has invalid restBetweenExercises.`);
			}
			if (exercise.duration !== undefined && exercise.duration <= 0) {
				errors.push(`Exercise "${exercise.name || exercise.id}" duration must be > 0 when provided.`);
			}
			if (exerciseIds.has(exercise.id)) {
				errors.push(`Duplicate exercise id "${exercise.id}".`);
			}
			exerciseIds.add(exercise.id);
		}
	}

	return errors;
}

export function assertProgramInvariants(program: Program): void {
	const errors = validateProgramInvariants(program);
	if (errors.length === 0) return;
	throw new Error(`Program validation failed: ${errors.join(' ')}`);
}
