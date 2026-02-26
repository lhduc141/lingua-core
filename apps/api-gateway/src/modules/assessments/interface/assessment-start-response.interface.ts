import { AssessmentQuestion } from './assessment-question.interface';

export interface AssessmentStartResponse {
	assessmentId: string;
	refType: string;
	totalQuestions: number;
	lesson?: {
		lessonId: string;
		title: string;
		skillName: string;
		cefrLevel: string | null;
		estimatedMinutes: number | null;
		theoryContent: any;
	};
	practiceSession?: {
		sessionId: string;
		title: string;
		skillName: string;
		cefrLevel: string | null;
		estimatedMinutes: number | null;
	};
	questions: AssessmentQuestion[];
}
