import { supabase } from './supabase';
import { getAppUserId } from '$lib/stores/auth-store.svelte';
import type { Program } from '$lib/types/program';
import { programVersionRepository } from './program-version-repository';
import { featureFlags } from '$lib/utils/feature-flags';

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

	async getAll(): Promise<Program[]> {
		const { data, error } = await supabase
			.from('programs')
			.select()
			.order('created_at', { ascending: false });

		if (error) throw error;
		const programs = (data || []).map((row) => this.mapFromDb(row));
		return Promise.all(programs.map((program) => this.hydrateFromCurrentVersion(program)));
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
	}

	async delete(id: string): Promise<void> {
		const { error } = await supabase.from('programs').delete().eq('id', id);
		if (error) throw error;
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
}

export const programRepository = new ProgramRepository();
