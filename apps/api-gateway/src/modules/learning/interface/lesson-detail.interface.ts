import { SkillName } from '@prisma/client';
import { QuestionItem } from './question-item.interface';

export interface LessonDetail {
	lessonId: string;
	skillName: SkillName;
	title: string;
	description: string | null;
	cefrLevel: string | null;
	estimatedMinutes: number | null;
	theoryContent: unknown | null;
	prerequisites: string[];
	questions: QuestionItem[];
}
