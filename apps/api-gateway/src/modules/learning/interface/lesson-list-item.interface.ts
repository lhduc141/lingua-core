import { SkillName } from '@prisma/client';

export interface LessonListItem {
	lessonId: string;
	skillName: SkillName;

	title: string;
	description: string | null;
	cefrLevel: string | null;

	estimatedMinutes: number | null;
	status: string;

	// update 08/04/2026
	userProgress: {
		isCompleted: boolean;
		bestScore: number | null;
		attemptCount: number;
		lastAttemptAt: string | null;
	} | null;
}
