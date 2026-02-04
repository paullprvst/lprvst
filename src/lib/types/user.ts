export interface UserPreferences {
	theme?: 'light' | 'dark' | 'system';
}

export interface User {
	id: string;
	authUserId?: string;
	objectives: string;
	profile: UserProfile;
	preferences?: UserPreferences;
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
