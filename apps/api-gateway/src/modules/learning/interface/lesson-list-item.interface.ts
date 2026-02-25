import { SkillName } from '@prisma/client';

export interface LessonListItem {
	lessonId: string;
	skillName: SkillName;

	title: string;
	description: string | null;
	cefrLevel: string | null;

	estimatedMinutes: number | null;
	status: string;
}
