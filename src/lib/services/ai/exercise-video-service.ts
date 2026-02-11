import { postJSON } from './api-client';
import {
	exerciseVideoRepository,
	type ExerciseVideo
} from '../storage/exercise-video-repository';

function normalizeExerciseName(name: string): string {
	return `v3_${name.toLowerCase().trim().replace(/\s+/g, '_')}`;
}

export interface ExerciseVideoContext {
	exerciseName: string;
	equipment?: string[];
	notes?: string;
}

export interface ExerciseVideoResponse {
	videos: ExerciseVideo[];
	unavailableReason?: string;
}

const memoryCache = new Map<string, ExerciseVideoResponse>();

interface ExerciseVideoOptions {
	forceRefresh?: boolean;
}

export async function getExerciseVideos(
	context: ExerciseVideoContext,
	options: ExerciseVideoOptions = {}
): Promise<ExerciseVideoResponse> {
	const { exerciseName, equipment, notes } = context;
	const { forceRefresh = false } = options;
	const cacheKey = normalizeExerciseName(exerciseName);

	if (!forceRefresh && memoryCache.has(cacheKey)) {
		return memoryCache.get(cacheKey) ?? { videos: [] };
	}

	if (!forceRefresh) {
		try {
			const dbRecord = await exerciseVideoRepository.getByName(exerciseName);
			if (dbRecord?.videos?.length) {
				const cachedResponse = { videos: dbRecord.videos };
				memoryCache.set(cacheKey, cachedResponse);
				return cachedResponse;
			}
		} catch (err) {
			console.warn('Failed to fetch exercise videos from DB cache:', err);
		}
	}

	const response = await postJSON<ExerciseVideoResponse>('/api/exercises/videos', {
		exerciseName,
		equipment,
		notes
	});

	memoryCache.set(cacheKey, response);

	if (response.videos?.length) {
		exerciseVideoRepository.save(exerciseName, response.videos).catch((err) => {
			console.warn('Failed to save exercise videos to DB cache:', err);
		});
	}

	return response;
}
