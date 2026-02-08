export type StepLogData = Record<string, unknown>;
export type StepLogger = (step: string, data?: StepLogData) => void;

function toSafeError(error: unknown): StepLogData {
	if (error instanceof Error) {
		return {
			errorName: error.name,
			errorMessage: error.message
		};
	}
	return { errorMessage: String(error) };
}

export function createStepLogger(scope: string, baseData: StepLogData = {}): StepLogger {
	const startedAt = performance.now();
	let lastAt = startedAt;
	let sequence = 0;

	return (step: string, data: StepLogData = {}) => {
		const now = performance.now();
		const deltaMs = Number((now - lastAt).toFixed(1));
		const totalMs = Number((now - startedAt).toFixed(1));
		lastAt = now;
		sequence += 1;

		console.info(`[${scope}] #${sequence} ${step} +${deltaMs}ms (T+${totalMs}ms)`, {
			...baseData,
			...data,
			step,
			sequence,
			deltaMs,
			totalMs
		});
	};
}

export function logAndRethrow(logStep: StepLogger, step: string, error: unknown): never {
	logStep(step, toSafeError(error));
	throw error;
}
