export interface SelectionStrategy {
	method: 'max-information' | 'randomized-information';

	exposureControl: {
		enabled: boolean;
		maxExposureControl: number;
	};

	contentBalancing: {
		enabled: boolean;
		minQuestionsPerDifficulty: Record<string, number>;
	};
}
