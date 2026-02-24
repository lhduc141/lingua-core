export const EXPOSURE_LIMITS = {
	maxRate: 0.3, // 30% max usage across all sessions
	penalty: 0.5, // Multiply priority by this if over-exposed
} as const;
