import { db } from './db';
import type { User } from '$lib/types/user';

export class UserRepository {
	async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
		const newUser: User = {
			...user,
			id: crypto.randomUUID(),
			createdAt: new Date(),
			updatedAt: new Date()
		};
		await db.users.add(newUser);
		return newUser;
	}

	async get(id: string): Promise<User | undefined> {
		return await db.users.get(id);
	}

	async getFirst(): Promise<User | undefined> {
		return await db.users.toCollection().first();
	}

	async update(id: string, updates: Partial<User>): Promise<void> {
		await db.users.update(id, {
			...updates,
			updatedAt: new Date()
		});
	}

	async delete(id: string): Promise<void> {
		await db.users.delete(id);
	}
}

export const userRepository = new UserRepository();
