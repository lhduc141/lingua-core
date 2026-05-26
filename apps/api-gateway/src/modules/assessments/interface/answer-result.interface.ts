import { PronunciationScores } from '@app/shared';

export interface AnswerResult {
	questionId: string;
	questionType: string; // mcq_single | mcq_multi | fill_blank | essay | speaking
	isCorrect: boolean | null;
	earnedScore: number | null;
	maxScore: number;
	gradingStatus: string;

	stemText: string | null;

	userAnswer: {
		optionIds?: string[]; // mcq_single/mcq_multi — array of optionId
		optionTexts?: string[];
		textAnswer?: string; // fill_blank/essay/speaking
	} | null;
	correctAnswer: {
		optionIds?: string[]; // optionId của đáp án đúng (mcq)
		optionTexts?: string[]; // text của đáp án đúng (mcq) — để hiển thị
		textAnswers?: string[]; // answerKeysJson (fill_blank)
	} | null;

	aiFeedback: {
		overallScore: number;
		estimatedIeltsBand: number | null;
		internalScore: number;
		scoreConfidence: string;
		scoreRationale: string;
		assessmentType: string | null;
		currentLevel: string | null;
		targetLevel: string | null;
		currentBand: string | null;
		targetBand: string | null;
		wordCount: number;
		wordCountStatus: string;
		criterionBands: Array<{
			name: string;
			bandEstimate: number | null;
			internalScore: number;
			summary?: string;
			strengths?: string[];
			weaknesses?: string[];
		}>;
		corrections: Array<{ original: string; corrected: string; rule: string }>;
		priorityFixes: string[];
		nextLevelGaps: string[];
		nextBandTarget: number | null;
		styleImprovements: string[];
		correctedText: string | null;
		pronunciationConfidence: string | null;
		pronunciationScores: PronunciationScores | null;
		dimensions?: Array<{ name: string; score: number; feedback: string }>;
		suggestions?: string[];
	} | null;
}
