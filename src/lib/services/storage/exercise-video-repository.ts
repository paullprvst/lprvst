import { supabase } from './supabase';

export interface ExerciseVideo {
	id: string;
	url: string;
	thumbnailUrl: string;
}

export interface ExerciseVideoCache {
	id: string;
	exerciseName: string;
	normalizedName: string;
	videos: ExerciseVideo[];
	createdAt: Date;
	updatedAt: Date;
}

function normalizeExerciseName(name: string): string {
	return `v3_${name.toLowerCase().trim().replace(/\s+/g, '_')}`;
}

export class ExerciseVideoRepository {
	async getByName(exerciseName: string): Promise<ExerciseVideoCache | null> {
		const normalizedName = normalizeExerciseName(exerciseName);

		const { data, error } = await supabase
			.from('exercise_videos')
			.select()
			.eq('normalized_name', normalizedName)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}

		return this.mapFromDb(data);
	}

	async save(exerciseName: string, videos: ExerciseVideo[]): Promise<ExerciseVideoCache> {
		const normalizedName = normalizeExerciseName(exerciseName);

		const { data, error } = await supabase
			.from('exercise_videos')
			.upsert(
				{
					exercise_name: exerciseName,
					normalized_name: normalizedName,
					videos
				},
				{ onConflict: 'normalized_name' }
			)
			.select()
			.single();

		if (error) throw error;
		return this.mapFromDb(data);
	}

	private mapFromDb(data: Record<string, unknown>): ExerciseVideoCache {
		return {
			id: data.id as string,
			exerciseName: data.exercise_name as string,
			normalizedName: data.normalized_name as string,
			videos: Array.isArray(data.videos) ? (data.videos as ExerciseVideo[]) : [],
			createdAt: new Date(data.created_at as string),
			updatedAt: new Date(data.updated_at as string)
		};
	}
}

export const exerciseVideoRepository = new ExerciseVideoRepository();
