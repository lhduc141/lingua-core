import { Prisma } from '@prisma/client';
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
} as const;
