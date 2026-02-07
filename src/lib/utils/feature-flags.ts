function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
	if (value === undefined) return defaultValue;
	const normalized = value.trim().toLowerCase();
	if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
	if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
	return defaultValue;
}

export const featureFlags = {
	programVersioningReads: parseBoolean(import.meta.env.PUBLIC_PROGRAM_VERSIONING_READS, true),
	programVersioningWrites: parseBoolean(import.meta.env.PUBLIC_PROGRAM_VERSIONING_WRITES, true),
	agentToolCalling: parseBoolean(import.meta.env.PUBLIC_AGENT_TOOL_CALLING, true)
};
