import { Prisma } from '@prisma/client';
import { LessonQuestionSelect } from './lesson-question.select';
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
		_count: {
			select: { lessonQuestions: true },
		},
	} satisfies Prisma.LessonSelect,

	//Admin Select
	adminList: {
		lessonId: true,
		skillName: true,
		title: true,
		cefrLevel: true,
		estimatedMinutes: true,
		status: true,
		_count: {
			select: { lessonQuestions: true },
		},
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

	idTitle: {
		lessonId: true,
		title: true,
	} satisfies Prisma.LessonSelect,

	titleSkill: {
		lessonId: true,
		title: true,
		skillName: true,
	} satisfies Prisma.LessonSelect,

	skillOnly: {
		skillName: true,
	} satisfies Prisma.LessonSelect,

	planAvailable: {
		lessonId: true,
		title: true,
		skillName: true,
		cefrLevel: true,
		estimatedMinutes: true,
	} satisfies Prisma.LessonSelect,

	// Compact semantic metadata used by Stage 1 content selection.
	planCatalog: {
		lessonId: true,
		title: true,
		description: true,
		skillName: true,
		cefrLevel: true,
		estimatedMinutes: true,
	} satisfies Prisma.LessonSelect,

	// Only fetched for content selected by Stage 1. Keep it intentionally bounded.
	planDetail: {
		lessonId: true,
		title: true,
		description: true,
		skillName: true,
		cefrLevel: true,
		estimatedMinutes: true,
		theoryContent: true,
		prerequisites: true,
		_count: { select: { lessonQuestions: true } },
		lessonQuestions: {
			orderBy: { position: 'asc' as const },
			take: 3,
			select: {
				position: true,
				question: {
					select: {
						type: true,
						translations: {
							where: { locale: 'en' },
							take: 1,
							select: { stemText: true },
						},
					},
				},
			},
		},
	} satisfies Prisma.LessonSelect,

	assessmentMeta: {
		title: true,
		skillName: true,
		cefrLevel: true,
		lessonQuestions: { select: LessonQuestionSelect.idOnly },
	} satisfies Prisma.LessonSelect,
} as const;
