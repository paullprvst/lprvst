export interface User {
	id: string;
	objectives: string;
	profile: UserProfile;
	createdAt: Date;
	updatedAt: Date;
}

export interface UserProfile {
	fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
	availableEquipment: string[];
	schedule: WeeklySchedule;
	injuries?: string;
	preferences?: string;
}

export interface WeeklySchedule {
	daysPerWeek: number;
	preferredDays?: string[];
	sessionDuration?: number;
}
