export interface PronunciationWordResult {
	word: string;
	accuracyScore: number;
	errorType: string | null;
	offset?: number | null;
	duration?: number | null;
}

export interface PronunciationScores {
	accuracyScore: number;
	fluencyScore: number;
	completenessScore: number;
	prosodyScore?: number | null;
	pronComposite: number;
	estimatedBand: number;
	words: PronunciationWordResult[];
}
