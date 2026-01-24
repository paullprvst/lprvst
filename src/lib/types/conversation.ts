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
	timestamp: Date;
}
