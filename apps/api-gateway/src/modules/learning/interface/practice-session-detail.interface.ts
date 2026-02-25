import { SkillName } from '@prisma/client';
import { QuestionItem } from './question-item.interface';

export interface PracticeSessionDetail {
	sessionId: string;
	skillName: SkillName;

	title: string;
	description: string | null;
	cefrLevel: string | null;
	estimatedMinutes: number | null;
	questions: QuestionItem[];

	isActive: boolean;
}
