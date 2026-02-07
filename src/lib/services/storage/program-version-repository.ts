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
		const { data: versionRow, error: versionError } = await supabase
			.from('program_versions')
			.select()
			.eq('id', versionId)
			.single();

		if (versionError) {
			if (versionError.code === 'PGRST116') return null;
			throw versionError;
		}

		const { data: workoutRows, error: workoutError } = await supabase
			.from('program_version_workouts')
			.select()
			.eq('program_version_id', versionId)
			.order('position', { ascending: true });

		if (workoutError) throw workoutError;

		const workoutIds = (workoutRows || []).map((row) => row.id as string);

		let exerciseRows: Array<Record<string, unknown>> = [];
		if (workoutIds.length > 0) {
			const { data, error } = await supabase
				.from('program_version_exercises')
				.select()
				.in('workout_version_id', workoutIds)
				.order('position', { ascending: true });
			if (error) throw error;
			exerciseRows = (data || []) as Array<Record<string, unknown>>;
		}

		const { data: scheduleRows, error: scheduleError } = await supabase
			.from('program_version_schedule')
			.select()
			.eq('program_version_id', versionId)
			.order('day_of_week', { ascending: true });

		if (scheduleError) throw scheduleError;

		const exerciseByWorkout = new Map<string, ProgramVersionExercise[]>();
		for (const row of exerciseRows) {
			const workoutVersionId = row.workout_version_id as string;
			const list = exerciseByWorkout.get(workoutVersionId) || [];
			list.push(this.mapExercise(row));
			exerciseByWorkout.set(workoutVersionId, list);
		}

		const workouts: ProgramVersionWorkout[] = (workoutRows || []).map((row) => {
			const mapped = this.mapWorkout(row as Record<string, unknown>);
			return {
				...mapped,
				exercises: exerciseByWorkout.get(mapped.id) || []
			};
		});

		const schedule: ProgramVersionSchedule[] = ((scheduleRows || []) as Array<Record<string, unknown>>).map(
			(row) => this.mapSchedule(row)
		);

		return {
			id: versionRow.id as string,
			programId: versionRow.program_id as string,
			versionNumber: versionRow.version_number as number,
			source: versionRow.source as ProgramVersion['source'],
			name: versionRow.name as string,
			description: versionRow.description as string,
			startDate: new Date(versionRow.start_date as string),
			workouts,
			schedule,
			createdAt: new Date(versionRow.created_at as string)
		};
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
