export interface Conversation {
	id: string;
	type: 'onboarding' | 'reevaluation';
	messages: Message[];
	status: 'active' | 'completed';
	userId?: string;
	programId?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface Message {
	role: 'user' | 'assistant';
	content: string;
	displayContent?: string; // Optional content shown in UI (when different from AI context)
	timestamp: Date;
}
