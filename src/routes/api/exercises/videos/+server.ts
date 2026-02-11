import { env } from '$env/dynamic/private';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import type { ExerciseVideo } from '$lib/services/storage/exercise-video-repository';
import { isAiDebugAllowed, recordAiDebugLog } from '$lib/server/ai-debug-log';

interface YouTubeSearchResponse {
	items?: Array<{
		id?: {
			videoId?: string;
		};
		snippet?: {
			title?: string;
			thumbnails?: {
				high?: { url?: string };
				medium?: { url?: string };
				default?: { url?: string };
			};
		};
	}>;
}

const MAX_VIDEOS = 6;

function buildQuery(exerciseName: string): string {
	return `how to ${exerciseName}`;
}

function mapVideos(payload: YouTubeSearchResponse): ExerciseVideo[] {
	const selected = new Map<string, ExerciseVideo>();

	for (const item of payload.items ?? []) {
		if (selected.size >= MAX_VIDEOS) break;

		const videoId = item.id?.videoId?.trim();
		if (!videoId || selected.has(videoId)) continue;

		const thumbnailUrl =
			item.snippet?.thumbnails?.high?.url ||
			item.snippet?.thumbnails?.medium?.url ||
			item.snippet?.thumbnails?.default?.url ||
			`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

		selected.set(videoId, {
			id: videoId,
			url: `https://www.youtube.com/watch?v=${videoId}`,
			thumbnailUrl
		});
	}

	return Array.from(selected.values());
}

export const POST: RequestHandler = async (event) => {
	const { user } = await requireAuth(event);
	let requestPayload: Record<string, unknown> | null = null;

	try {
		const body = await event.request.json();
		const { exerciseName, debug }: { exerciseName?: string; debug?: boolean } = body;
		const debugRequested = debug === true;
		const debugAllowed = isAiDebugAllowed(user.email);

		requestPayload = {
			exerciseName: exerciseName ?? '',
			debugRequested
		};

		if (!exerciseName?.trim()) {
			throw error(400, 'Exercise name is required');
		}

		const apiKey = env.YOUTUBE_DATA_API_KEY;
		if (!apiKey?.trim()) {
			const responsePayload = {
				videos: [],
				unavailableReason: 'YouTube videos are not configured yet.'
			};
			await recordAiDebugLog({
				authUserId: user.id,
				userEmail: user.email,
				source: 'api/exercises/videos',
				requestPayload,
				responsePayload
			});
			return json(responsePayload);
		}

		const query = buildQuery(exerciseName);
		requestPayload = {
			exerciseName,
			debugRequested,
			query,
			maxVideos: MAX_VIDEOS
		};

		const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
		searchUrl.searchParams.set('part', 'snippet');
		searchUrl.searchParams.set('type', 'video');
		searchUrl.searchParams.set('maxResults', String(MAX_VIDEOS));
		searchUrl.searchParams.set('q', query);
		searchUrl.searchParams.set('key', apiKey);

		const response = await fetch(searchUrl);
		if (!response.ok) {
			const details = await response.text().catch(() => '');
			throw error(502, `Failed to fetch YouTube videos: ${details || response.statusText}`);
		}

		const payload = (await response.json()) as YouTubeSearchResponse;
		const videos = mapVideos(payload);

		const debugPayload = {
			query,
			maxVideos: MAX_VIDEOS,
			returnedCount: videos.length,
			selectedVideoIds: videos.map((video) => video.id),
			candidates: (payload.items ?? []).map((item) => ({
				videoId: item.id?.videoId ?? '',
				title: item.snippet?.title ?? ''
			}))
		};

		await recordAiDebugLog({
			authUserId: user.id,
			userEmail: user.email,
			source: 'api/exercises/videos',
			requestPayload,
			responsePayload: debugPayload
		});

		if (debugRequested && debugAllowed) {
			return json({ videos, debug: debugPayload });
		}

		return json({ videos });
	} catch (caughtError) {
		const message = caughtError instanceof Error ? caughtError.message : String(caughtError);
		await recordAiDebugLog({
			authUserId: user.id,
			userEmail: user.email,
			source: 'api/exercises/videos',
			requestPayload: requestPayload ?? {},
			errorMessage: message
		});
		throw caughtError;
	}
};
