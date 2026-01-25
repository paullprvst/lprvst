import { supabase } from './supabase';
import type { Program } from '$lib/types/program';

export class ProgramRepository {
	async create(program: Omit<Program, 'id' | 'createdAt' | 'updatedAt'>): Promise<Program> {
		const { data, error } = await supabase
			.from('programs')
			.insert({
				name: program.name,
				description: program.description,
				start_date: program.startDate,
				schedule: program.schedule,
				workouts: program.workouts
			})
			.select()
			.single();

		if (error) throw error;
		return this.mapFromDb(data);
	}

	async get(id: string): Promise<Program | undefined> {
		const { data, error } = await supabase.from('programs').select().eq('id', id).single();

		if (error) {
			if (error.code === 'PGRST116') return undefined;
			throw error;
		}
		return this.mapFromDb(data);
	}

	async getAll(): Promise<Program[]> {
		const { data, error } = await supabase
			.from('programs')
			.select()
			.order('created_at', { ascending: false });

		if (error) throw error;
		return (data || []).map((row) => this.mapFromDb(row));
	}

	async update(id: string, updates: Partial<Program>): Promise<void> {
		const dbUpdates: Record<string, unknown> = {};
		if (updates.name !== undefined) dbUpdates.name = updates.name;
		if (updates.description !== undefined) dbUpdates.description = updates.description;
		if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
		if (updates.schedule !== undefined) dbUpdates.schedule = updates.schedule;
		if (updates.workouts !== undefined) dbUpdates.workouts = updates.workouts;

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
			name: data.name as string,
			description: data.description as string,
			startDate: new Date(data.start_date as string),
			schedule: data.schedule as Program['schedule'],
			workouts: data.workouts as Program['workouts'],
			createdAt: new Date(data.created_at as string),
			updatedAt: new Date(data.updated_at as string)
		};
	}
}

export const programRepository = new ProgramRepository();
