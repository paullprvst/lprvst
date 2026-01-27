import { z } from 'zod';

export interface WeightEntry {
	id: string;
	weight: number;
	recordedAt: Date;
	notes?: string;
	createdAt: Date;
	updatedAt: Date;
}

export const weightEntrySchema = z.object({
	weight: z
		.number()
		.min(20, 'Weight must be at least 20 kg')
		.max(500, 'Weight must be at most 500 kg'),
	recordedAt: z.date(),
	notes: z.string().max(500, 'Notes must be at most 500 characters').optional()
});

export type WeightEntryInput = z.infer<typeof weightEntrySchema>;
