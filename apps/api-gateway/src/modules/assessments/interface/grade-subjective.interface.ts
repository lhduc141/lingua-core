export interface GradeSubjectiveJobData {
	answerId: string;
	exerciseRecordId: string;
	questionType: string;
	textAnswer: string;

	// RAG fields -> update 21/05/2026
	stemText: string;
	cefrLevel: string;
	minWords: number;
	maxWords: number;
	userId: string;
}
