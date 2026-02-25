import { Prisma } from '@prisma/client';
import { QuestionSelect } from './question.select';

export const LessonSelect = {
	list: {
		lessonId: true,
		skillName: true,
		title: true,
		description: true,
		cefrLevel: true,
		estimatedMinutes: true,
		status: true,
	} satisfies Prisma.LessonSelect,

	detail: {
		lessonId: true,
		skillName: true,
		title: true,
		description: true,
		cefrLevel: true,
		estimatedMinutes: true,
		theoryContent: true,
		prerequisites: true,
		lessonQuestions: {
			orderBy: { position: 'asc' as const },
			select: {
				position: true,
				question: { select: QuestionSelect.detail },
			},
		},
	} satisfies Prisma.LessonSelect,
} as const;
