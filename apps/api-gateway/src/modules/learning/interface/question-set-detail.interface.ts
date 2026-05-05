import { SkillName } from '@app/shared';
import { QuestionItem } from './question-item.interface';

export interface QuestionSetDetail {
	questionSetId: string;
	skillName: SkillName;

	title: string;
	description: string | null;
	cefrLevel: string | null;
	estimatedMinutes: number | null;
	questions: QuestionItem[];

	isActive: boolean;
}
