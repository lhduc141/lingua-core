export const DEFAULT_CAT_CONFIG = {
	initialTheta: 0.0,
	initialSe: 2.0,
	targetSe: 0.3,
	minQuestions: 10,
	maxQuestions: 20,
	convergenceThreshold: 0.01, // For MLE iteration
	maxIterations: 50, // For MLE Newton-Raphson
} as const;
