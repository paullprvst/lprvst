export type ProgramChangeOperation = 'add' | 'remove' | 'replace';

export type ProgramChangeEntity = 'program' | 'schedule' | 'workout' | 'exercise';

export interface ProgramChange {
	op: ProgramChangeOperation;
	entityType: ProgramChangeEntity;
	entityId: string;
	field: string;
	before?: unknown;
	after?: unknown;
	reason?: string;
}

export type AgentAction =
	| {
			type: 'create_program';
			programId: string;
			programVersionId?: string;
	  }
	| {
			type: 'modify_program';
			programId: string;
			previousVersionId?: string;
			programVersionId?: string;
			changeSet: ProgramChange[];
	  };

export interface AgentTurnResponse {
	text: string;
	action?: AgentAction;
}
