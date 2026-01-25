import { supabase } from './supabase';

export interface ExerciseDescription {
	id: string;
	exerciseName: string;
	normalizedName: string;
	description: string;
	createdAt: Date;
}

function normalizeExerciseName(name: string): string {
	return name.toLowerCase().trim().replace(/\s+/g, '_');
}

export class ExerciseDescriptionRepository {
	async getByName(exerciseName: string): Promise<ExerciseDescription | null> {
		const normalizedName = normalizeExerciseName(exerciseName);

		const { data, error } = await supabase
			.from('exercise_descriptions')
			.select()
			.eq('normalized_name', normalizedName)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null; // Not found
			throw error;
		}

		return this.mapFromDb(data);
	}

	async save(exerciseName: string, description: string): Promise<ExerciseDescription> {
		const normalizedName = normalizeExerciseName(exerciseName);

		const { data, error } = await supabase
			.from('exercise_descriptions')
			.upsert(
				{
					exercise_name: exerciseName,
					normalized_name: normalizedName,
					description
				},
				{ onConflict: 'normalized_name' }
			)
			.select()
			.single();

		if (error) throw error;
		return this.mapFromDb(data);
	}

	private mapFromDb(data: Record<string, unknown>): ExerciseDescription {
		return {
			id: data.id as string,
			exerciseName: data.exercise_name as string,
			normalizedName: data.normalized_name as string,
			description: data.description as string,
			createdAt: new Date(data.created_at as string)
		};
	}
}

export const exerciseDescriptionRepository = new ExerciseDescriptionRepository();
