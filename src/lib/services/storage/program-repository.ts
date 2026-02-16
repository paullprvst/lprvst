import { supabase } from './supabase';
import { getAppUserId } from '$lib/stores/auth-store.svelte';
import type { Program } from '$lib/types/program';
import { programVersionRepository } from './program-version-repository';
import { featureFlags } from '$lib/utils/feature-flags';
import { clearTabCache } from '$lib/services/tab-cache';
import { TAB_CACHE_KEYS } from '$lib/services/tab-cache-keys';

type ProgramSortBy = 'created' | 'last-used';

export class ProgramRepository {
	async create(program: Omit<Program, 'id' | 'createdAt' | 'updatedAt'>): Promise<Program> {
		const userId = await getAppUserId();
		if (!userId) {
			console.error('[workout:create] Program create blocked: no authenticated user');
			throw new Error('User must be authenticated to create a program');
		}
		console.info('[workout:create] Inserting program into database', {
			userId,
			programName: program.name,
			workoutCount: program.workouts.length,
			scheduleDays: program.schedule.weeklyPattern.length,
			isPaused: program.isPaused ?? false
		});

		const { data, error } = await supabase
			.from('programs')
			.insert({
				user_id: userId,
				is_paused: program.isPaused ?? false,
				name: program.name,
				description: program.description,
				start_date: program.startDate,
				schedule: program.schedule,
				workouts: program.workouts
			})
			.select()
			.single();

		if (error) {
			console.error('[workout:create] Program insert failed', {
				userId,
				code: error.code,
				message: error.message,
				details: error.details,
				hint: error.hint
			});
			throw error;
		}
		console.info('[workout:create] Program insert succeeded', {
			userId,
			programId: data.id as string
		});
		this.invalidateTabCaches();
		return this.hydrateFromCurrentVersion(this.mapFromDb(data));
	}

	async get(id: string): Promise<Program | undefined> {
		const { data, error } = await supabase.from('programs').select().eq('id', id).single();

		if (error) {
			if (error.code === 'PGRST116') return undefined;
			throw error;
		}
		return this.hydrateFromCurrentVersion(this.mapFromDb(data));
	}

	async getAll(options: { sortBy?: ProgramSortBy } = {}): Promise<Program[]> {
		const { data, error } = await supabase
			.from('programs')
			.select()
			.order('created_at', { ascending: false });

		if (error) throw error;
		const programs = (data || []).map((row) => this.mapFromDb(row));
		let hydratedPrograms = programs;
		if (featureFlags.programVersioningReads) {
			try {
				const versionIds = [
					...new Set(programs.map((program) => program.currentVersionId).filter(Boolean))
				] as string[];
				const versionsById = await programVersionRepository.getByIds(versionIds);
				hydratedPrograms = programs.map((program) => {
					if (!program.currentVersionId) return program;
					const version = versionsById.get(program.currentVersionId);
					if (!version) return program;

					const projection = programVersionRepository.toProjection(version);
					return {
						...program,
						name: projection.name,
						description: projection.description,
						startDate: projection.startDate,
						schedule: {
							...projection.schedule,
							duration: program.schedule.duration
						},
						workouts: projection.workouts
					};
				});
			} catch (hydrateError) {
				console.warn('Failed to hydrate programs from current versions:', hydrateError);
			}
		}

		if (options.sortBy !== 'last-used') {
			return hydratedPrograms;
		}

		const lastUsedAtByProgramId = await this.getLastUsedAtByProgramId();
		return hydratedPrograms.sort((a, b) => {
			const aLastUsedAt = lastUsedAtByProgramId.get(a.id);
			const bLastUsedAt = lastUsedAtByProgramId.get(b.id);

			if (aLastUsedAt && bLastUsedAt) {
				return bLastUsedAt.getTime() - aLastUsedAt.getTime();
			}
			if (aLastUsedAt) return -1;
			if (bLastUsedAt) return 1;

			return b.createdAt.getTime() - a.createdAt.getTime();
		});
	}

	async update(id: string, updates: Partial<Program>): Promise<void> {
		const dbUpdates: Record<string, unknown> = {};
		if (updates.name !== undefined) dbUpdates.name = updates.name;
		if (updates.description !== undefined) dbUpdates.description = updates.description;
		if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
		if (updates.schedule !== undefined) dbUpdates.schedule = updates.schedule;
		if (updates.workouts !== undefined) dbUpdates.workouts = updates.workouts;
		if (updates.currentVersionId !== undefined) dbUpdates.current_version_id = updates.currentVersionId;
		if (updates.isPaused !== undefined) dbUpdates.is_paused = updates.isPaused;

		const { error } = await supabase.from('programs').update(dbUpdates).eq('id', id);

		if (error) throw error;
		this.invalidateTabCaches();
	}

	async delete(id: string): Promise<void> {
		const { error } = await supabase.from('programs').delete().eq('id', id);
		if (error) throw error;
		this.invalidateTabCaches();
	}

	private mapFromDb(data: Record<string, unknown>): Program {
		return {
			id: data.id as string,
			userId: data.user_id as string | undefined,
			currentVersionId: data.current_version_id as string | undefined,
			isPaused: Boolean(data.is_paused ?? false),
			name: data.name as string,
			description: data.description as string,
			startDate: new Date(data.start_date as string),
			schedule: data.schedule as Program['schedule'],
			workouts: data.workouts as Program['workouts'],
			createdAt: new Date(data.created_at as string),
			updatedAt: new Date(data.updated_at as string)
		};
	}

	private async hydrateFromCurrentVersion(program: Program): Promise<Program> {
		if (!featureFlags.programVersioningReads) return program;
		if (!program.currentVersionId) return program;

		try {
			const version = await programVersionRepository.getById(program.currentVersionId);
			if (!version) return program;

			const projection = programVersionRepository.toProjection(version);
			return {
				...program,
				name: projection.name,
				description: projection.description,
				startDate: projection.startDate,
				schedule: {
					...projection.schedule,
					duration: program.schedule.duration
				},
				workouts: projection.workouts
			};
		} catch (error) {
			console.warn('Failed to hydrate program from current version:', error);
			return program;
		}
	}

	private async getLastUsedAtByProgramId(): Promise<Map<string, Date>> {
		const { data, error } = await supabase
			.from('workout_sessions')
			.select('program_id, completed_at, started_at')
			.not('program_id', 'is', null);

		if (error) {
			console.warn('Failed to fetch program usage timestamps:', error);
			return new Map();
		}

		const lastUsedAtByProgramId = new Map<string, Date>();
		for (const row of data || []) {
			const programId = row.program_id as string | null;
			const completedAt = row.completed_at as string | null;
			const startedAt = row.started_at as string | null;
			const timestamp = completedAt ?? startedAt;

			if (!programId || !timestamp) continue;

			const usedAt = new Date(timestamp);
			if (Number.isNaN(usedAt.getTime())) continue;

			const currentMostRecent = lastUsedAtByProgramId.get(programId);
			if (!currentMostRecent || usedAt > currentMostRecent) {
				lastUsedAtByProgramId.set(programId, usedAt);
			}
		}

		return lastUsedAtByProgramId;
	}

	private invalidateTabCaches(): void {
		clearTabCache(TAB_CACHE_KEYS.programs);
		clearTabCache(TAB_CACHE_KEYS.calendar);
		clearTabCache(TAB_CACHE_KEYS.history);
	}
}

export const programRepository = new ProgramRepository();
