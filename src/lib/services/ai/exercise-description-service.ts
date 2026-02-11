import { postStream } from './api-client';
import { exerciseDescriptionRepository } from '../storage/exercise-description-repository';

// In-memory cache for instant access during session
const memoryCache = new Map<string, string>();

function normalizeExerciseName(name: string): string {
	return name.toLowerCase().trim().replace(/\s+/g, '_');
}

export interface ExerciseDescriptionContext {
	exerciseName: string;
	equipment?: string[];
	notes?: string;
}

interface ExerciseDescriptionOptions {
	forceRefresh?: boolean;
}

export async function getCachedExerciseDescription(
	context: ExerciseDescriptionContext
): Promise<string | null> {
	const { exerciseName } = context;
	const cacheKey = normalizeExerciseName(exerciseName);

	if (memoryCache.has(cacheKey)) {
		return memoryCache.get(cacheKey) ?? null;
	}

	try {
		const dbRecord = await exerciseDescriptionRepository.getByName(exerciseName);
		if (dbRecord) {
			memoryCache.set(cacheKey, dbRecord.description);
			return dbRecord.description;
		}
	} catch (err) {
		console.warn('Failed to fetch cached description from DB:', err);
	}

	return null;
}

export async function getExerciseDescription(
	context: ExerciseDescriptionContext,
	onChunk: (text: string) => void,
	options: ExerciseDescriptionOptions = {}
): Promise<string> {
	const { exerciseName, equipment, notes } = context;
	const { forceRefresh = false } = options;
	const cacheKey = normalizeExerciseName(exerciseName);

	// Check memory cache first (instant)
	if (!forceRefresh && memoryCache.has(cacheKey)) {
		const cached = memoryCache.get(cacheKey)!;
		onChunk(cached);
		return cached;
	}

	// Check database
	if (!forceRefresh) {
		try {
			const dbRecord = await exerciseDescriptionRepository.getByName(exerciseName);
			if (dbRecord) {
				memoryCache.set(cacheKey, dbRecord.description);
				onChunk(dbRecord.description);
				return dbRecord.description;
			}
		} catch (err) {
			// DB unavailable, continue to generate
			console.warn('Failed to fetch from DB, generating fresh:', err);
		}
	}

	// Stream from server API
	let fullResponse = '';

	await postStream(
		'/api/exercises/describe',
		{
			exerciseName,
			equipment,
			notes,
			stream: true
		},
		(chunk) => {
			fullResponse += chunk;
			onChunk(chunk);
		}
	);

	// Save to memory cache
	memoryCache.set(cacheKey, fullResponse);

	// Save to database (fire and forget)
	exerciseDescriptionRepository.save(exerciseName, fullResponse).catch((err) => {
		console.warn('Failed to save exercise description to DB:', err);
	});

	return fullResponse;
}
