import { AssessmentQuestion } from './assessment-question.interface';

export interface AssessmentStartResponse {
	exerciseRecordId: string;
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
	questionSet?: {
		questionSetId: string;
		title: string;
		skillName: string;
		cefrLevel: string | null;
		estimatedMinutes: number | null;
	};
	questions: AssessmentQuestion[];
}
