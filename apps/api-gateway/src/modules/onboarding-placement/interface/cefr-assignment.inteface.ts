export interface CefrAssignment {
	// Point estimate of CEFR level
	level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

	// Confidence interval
	confidence: {
		lower: string; // CEFR level at theta - 1.96*SE
		upper: string; // CEFR level at theta + 1.96*SE
	};

	// Theta bounds
	thetaBounds: {
		lower: number; // theta - 1.96 * SE  (clamped to -3)
		estimate: number; // theta point estimate
		upper: number; // theta + 1.96 * SE  (clamped to +3)
	};
}
