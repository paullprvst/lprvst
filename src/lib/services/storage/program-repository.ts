import { db } from './db';
import type { Program } from '$lib/types/program';

export class ProgramRepository {
	async create(program: Omit<Program, 'id' | 'createdAt' | 'updatedAt'>): Promise<Program> {
		const newProgram: Program = {
			...program,
			id: crypto.randomUUID(),
			createdAt: new Date(),
			updatedAt: new Date()
		};
		await db.programs.add(newProgram);
		return newProgram;
	}

	async get(id: string): Promise<Program | undefined> {
		return await db.programs.get(id);
	}

	async getAll(): Promise<Program[]> {
		return await db.programs.orderBy('createdAt').reverse().toArray();
	}

	async update(id: string, updates: Partial<Program>): Promise<void> {
		await db.programs.update(id, {
			...updates,
			updatedAt: new Date()
		});
	}

	async delete(id: string): Promise<void> {
		await db.programs.delete(id);
	}
}

export const programRepository = new ProgramRepository();
