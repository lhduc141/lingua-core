import { Prisma } from '@prisma/client';
import { PracticeSessionQuestionSelect } from './practice-session-question.select';
import { QuestionSelect } from './question.select';

export const PracticeSessionSelect = {
	list: {
		sessionId: true,
		skillName: true,
		title: true,
		description: true,
		cefrLevel: true,
		estimatedMinutes: true,
		isActive: true,
		_count: {
			select: { questions: true },
		},
	} satisfies Prisma.PracticeSessionSelect,

	detail: {
		sessionId: true,
		skillName: true,
		title: true,
		description: true,
		cefrLevel: true,
		estimatedMinutes: true,
		isActive: true,
		questions: {
			orderBy: { position: 'asc' as const },
			select: {
				position: true,
				question: { select: QuestionSelect.detail },
			},
		},
	} satisfies Prisma.PracticeSessionSelect,

	idTitle: {
		sessionId: true,
		title: true,
	} satisfies Prisma.PracticeSessionSelect,

	titleSkill: {
		title: true,
		skillName: true,
	} satisfies Prisma.PracticeSessionSelect,

	skillOnly: {
		skillName: true,
	} satisfies Prisma.PracticeSessionSelect,

	planAvailable: {
		sessionId: true,
		title: true,
		skillName: true,
		cefrLevel: true,
		estimatedMinutes: true,
	} satisfies Prisma.PracticeSessionSelect,

	assessmentMeta: {
		title: true,
		skillName: true,
		cefrLevel: true,
		questions: { select: PracticeSessionQuestionSelect.idOnly },
	} satisfies Prisma.PracticeSessionSelect,
} as const;
