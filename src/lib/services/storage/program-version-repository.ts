import { supabase } from './supabase';
import type {
	ProgramVersion,
	ProgramVersionExercise,
	ProgramVersionProjection,
	ProgramVersionSchedule,
	ProgramVersionWorkout
} from '$lib/types/program-version';

export class ProgramVersionRepository {
	async getCurrent(programId: string): Promise<ProgramVersion | null> {
		const { data: programRow, error: programError } = await supabase
			.from('programs')
			.select('current_version_id')
			.eq('id', programId)
			.single();

		if (programError) {
			if (programError.code === 'PGRST116') return null;
			throw programError;
		}

		const currentVersionId = programRow?.current_version_id as string | null;
		if (!currentVersionId) return null;
		return this.getById(currentVersionId);
	}

	async getById(versionId: string): Promise<ProgramVersion | null> {
		const versionsById = await this.getByIds([versionId]);
		return versionsById.get(versionId) ?? null;
	}

	async getByIds(versionIds: string[]): Promise<Map<string, ProgramVersion>> {
		const normalizedVersionIds = [...new Set(versionIds.map((id) => id.trim()).filter(Boolean))];
		if (normalizedVersionIds.length === 0) {
			return new Map();
		}

		const { data: versionRows, error: versionError } = await supabase
			.from('program_versions')
			.select()
			.in('id', normalizedVersionIds);

		if (versionError) throw versionError;

		const versionRowsList = (versionRows || []) as Array<Record<string, unknown>>;
		if (versionRowsList.length === 0) {
			return new Map();
		}

		const foundVersionIds = versionRowsList.map((row) => row.id as string);

		const { data: workoutRows, error: workoutError } = await supabase
			.from('program_version_workouts')
			.select()
			.in('program_version_id', foundVersionIds)
			.order('position', { ascending: true });

		if (workoutError) throw workoutError;

		const workoutRowsList = (workoutRows || []) as Array<Record<string, unknown>>;
		const workoutIds = workoutRowsList.map((row) => row.id as string);

		let exerciseRowsList: Array<Record<string, unknown>> = [];
		if (workoutIds.length > 0) {
			const { data, error } = await supabase
				.from('program_version_exercises')
				.select()
				.in('workout_version_id', workoutIds)
				.order('position', { ascending: true });
			if (error) throw error;
			exerciseRowsList = (data || []) as Array<Record<string, unknown>>;
		}

		const { data: scheduleRows, error: scheduleError } = await supabase
			.from('program_version_schedule')
			.select()
			.in('program_version_id', foundVersionIds)
			.order('day_of_week', { ascending: true });

		if (scheduleError) throw scheduleError;

		const exerciseByWorkout = new Map<string, ProgramVersionExercise[]>();
		for (const row of exerciseRowsList) {
			const workoutVersionId = row.workout_version_id as string;
			const list = exerciseByWorkout.get(workoutVersionId) || [];
			list.push(this.mapExercise(row));
			exerciseByWorkout.set(workoutVersionId, list);
		}

		const workoutsByVersionId = new Map<string, ProgramVersionWorkout[]>();
		for (const row of workoutRowsList) {
			const mappedWorkout = this.mapWorkout(row);
			const list = workoutsByVersionId.get(mappedWorkout.programVersionId) || [];
			list.push({
				...mappedWorkout,
				exercises: exerciseByWorkout.get(mappedWorkout.id) || []
			});
			workoutsByVersionId.set(mappedWorkout.programVersionId, list);
		}

		const scheduleByVersionId = new Map<string, ProgramVersionSchedule[]>();
		for (const row of (scheduleRows || []) as Array<Record<string, unknown>>) {
			const mappedSchedule = this.mapSchedule(row);
			const list = scheduleByVersionId.get(mappedSchedule.programVersionId) || [];
			list.push(mappedSchedule);
			scheduleByVersionId.set(mappedSchedule.programVersionId, list);
		}

		const versions = new Map<string, ProgramVersion>();
		for (const row of versionRowsList) {
			const versionId = row.id as string;
			versions.set(versionId, {
				id: versionId,
				programId: row.program_id as string,
				versionNumber: row.version_number as number,
				source: row.source as ProgramVersion['source'],
				name: row.name as string,
				description: row.description as string,
				startDate: new Date(row.start_date as string),
				workouts: workoutsByVersionId.get(versionId) || [],
				schedule: scheduleByVersionId.get(versionId) || [],
				createdAt: new Date(row.created_at as string)
			});
		}

		return versions;
	}

	toProjection(version: ProgramVersion): ProgramVersionProjection {
		const workouts = version.workouts.map((workout) => ({
			id: workout.sourceWorkoutId,
			name: workout.name,
			type: workout.type,
			estimatedDuration: workout.estimatedDuration,
			notes: workout.notes,
			exercises: workout.exercises.map((exercise) => ({
				id: exercise.sourceExerciseId,
				name: exercise.name,
				sets: exercise.sets,
				reps: exercise.reps,
				duration: exercise.duration,
				restBetweenSets: exercise.restBetweenSets,
				restBetweenExercises: exercise.restBetweenExercises,
				equipment: exercise.equipment,
				notes: exercise.notes,
				type: exercise.type,
				targetMuscles: exercise.targetMuscles
			}))
		}));

		return {
			name: version.name,
			description: version.description,
			startDate: version.startDate,
			schedule: {
				weeklyPattern: version.schedule.map((item) => ({
					dayOfWeek: item.dayOfWeek,
					workoutIndex: item.workoutIndex
				}))
			},
			workouts
		};
	}

	private mapWorkout(row: Record<string, unknown>): ProgramVersionWorkout {
		return {
			id: row.id as string,
			programVersionId: row.program_version_id as string,
			sourceWorkoutId: row.source_workout_id as string,
			position: row.position as number,
			name: row.name as string,
			type: row.type as ProgramVersionWorkout['type'],
			estimatedDuration: row.estimated_duration as number,
			notes: (row.notes as string) || undefined,
			exercises: []
		};
	}

	private mapExercise(row: Record<string, unknown>): ProgramVersionExercise {
		const equipment = row.equipment;
		const targetMuscles = row.target_muscles;

		return {
			id: row.id as string,
			workoutVersionId: row.workout_version_id as string,
			sourceExerciseId: row.source_exercise_id as string,
			position: row.position as number,
			name: row.name as string,
			sets: row.sets as number,
			reps: (row.reps as string) || undefined,
			duration: (row.duration as number) || undefined,
			restBetweenSets: row.rest_between_sets as number,
			restBetweenExercises: row.rest_between_exercises as number,
			equipment: Array.isArray(equipment) ? (equipment as string[]) : [],
			notes: (row.notes as string) || undefined,
			type: row.type as ProgramVersionExercise['type'],
			targetMuscles: Array.isArray(targetMuscles)
				? (targetMuscles as ProgramVersionExercise['targetMuscles'])
				: undefined
		};
	}

	private mapSchedule(row: Record<string, unknown>): ProgramVersionSchedule {
		return {
			id: row.id as string,
			programVersionId: row.program_version_id as string,
			dayOfWeek: row.day_of_week as number,
			workoutIndex: row.workout_index as number,
			workoutVersionId: (row.workout_version_id as string) || undefined
		};
	}
}

export const programVersionRepository = new ProgramVersionRepository();
