import { SkillName } from '@prisma/client';

export interface QuestionSetListItem {
	sessionId: string;

	skillName: SkillName;
	title: string;
	description: string | null;
	cefrLevel: string | null;
	estimatedMinutes: number | null;

	isActive: boolean;
	questionCount: number;
}
