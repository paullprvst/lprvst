import { supabase } from './supabase';
import type { User } from '$lib/types/user';

export class UserRepository {
	async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
		const { data, error } = await supabase
			.from('users')
			.insert({
				objectives: user.objectives,
				profile: user.profile
			})
			.select()
			.single();

		if (error) throw error;
		return this.mapFromDb(data);
	}

	async get(id: string): Promise<User | undefined> {
		const { data, error } = await supabase.from('users').select().eq('id', id).single();

		if (error) {
			if (error.code === 'PGRST116') return undefined;
			throw error;
		}
		return this.mapFromDb(data);
	}

	async getFirst(): Promise<User | undefined> {
		const { data, error } = await supabase
			.from('users')
			.select()
			.order('created_at', { ascending: true })
			.limit(1)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return undefined;
			throw error;
		}
		return this.mapFromDb(data);
	}

	async update(id: string, updates: Partial<User>): Promise<void> {
		const dbUpdates: Record<string, unknown> = {};
		if (updates.objectives !== undefined) dbUpdates.objectives = updates.objectives;
		if (updates.profile !== undefined) dbUpdates.profile = updates.profile;

		const { error } = await supabase.from('users').update(dbUpdates).eq('id', id);

		if (error) throw error;
	}

	async delete(id: string): Promise<void> {
		const { error } = await supabase.from('users').delete().eq('id', id);
		if (error) throw error;
	}

	private mapFromDb(data: Record<string, unknown>): User {
		return {
			id: data.id as string,
			objectives: data.objectives as string,
			profile: data.profile as User['profile'],
			createdAt: new Date(data.created_at as string),
			updatedAt: new Date(data.updated_at as string)
		};
	}
}

export const userRepository = new UserRepository();
