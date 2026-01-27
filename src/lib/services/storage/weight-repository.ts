import { supabase } from './supabase';
import type { WeightEntry } from '$lib/types/weight-entry';

export class WeightRepository {
	async create(entry: Omit<WeightEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<WeightEntry> {
		const { data, error } = await supabase
			.from('weight_entries')
			.insert({
				weight: entry.weight,
				recorded_at: entry.recordedAt.toISOString().split('T')[0],
				notes: entry.notes
			})
			.select()
			.single();

		if (error) throw error;
		return this.mapFromDb(data);
	}

	async get(id: string): Promise<WeightEntry | undefined> {
		const { data, error } = await supabase.from('weight_entries').select().eq('id', id).single();

		if (error) {
			if (error.code === 'PGRST116') return undefined;
			throw error;
		}
		return this.mapFromDb(data);
	}

	async getAll(): Promise<WeightEntry[]> {
		const { data, error } = await supabase
			.from('weight_entries')
			.select()
			.order('recorded_at', { ascending: false });

		if (error) throw error;
		return (data || []).map((row) => this.mapFromDb(row));
	}

	async getRecent(limit: number = 30): Promise<WeightEntry[]> {
		const { data, error } = await supabase
			.from('weight_entries')
			.select()
			.order('recorded_at', { ascending: false })
			.limit(limit);

		if (error) throw error;
		return (data || []).map((row) => this.mapFromDb(row));
	}

	async getByDateRange(startDate: Date, endDate: Date): Promise<WeightEntry[]> {
		const { data, error } = await supabase
			.from('weight_entries')
			.select()
			.gte('recorded_at', startDate.toISOString().split('T')[0])
			.lte('recorded_at', endDate.toISOString().split('T')[0])
			.order('recorded_at', { ascending: true });

		if (error) throw error;
		return (data || []).map((row) => this.mapFromDb(row));
	}

	async update(id: string, updates: Partial<Omit<WeightEntry, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
		const dbUpdates: Record<string, unknown> = {};
		if (updates.weight !== undefined) dbUpdates.weight = updates.weight;
		if (updates.recordedAt !== undefined) dbUpdates.recorded_at = updates.recordedAt.toISOString().split('T')[0];
		if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

		const { error } = await supabase.from('weight_entries').update(dbUpdates).eq('id', id);

		if (error) throw error;
	}

	async delete(id: string): Promise<void> {
		const { error } = await supabase.from('weight_entries').delete().eq('id', id);
		if (error) throw error;
	}

	private mapFromDb(data: Record<string, unknown>): WeightEntry {
		return {
			id: data.id as string,
			weight: Number(data.weight),
			recordedAt: new Date(data.recorded_at as string),
			notes: data.notes as string | undefined,
			createdAt: new Date(data.created_at as string),
			updatedAt: new Date(data.updated_at as string)
		};
	}
}

export const weightRepository = new WeightRepository();
