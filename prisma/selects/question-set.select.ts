import { Prisma } from '@prisma/client';
import { QuestionSetItemSelect } from './question-set-item.select';
import { QuestionSelect } from './question.select';

export const QuestionSetSelect = {
	list: {
		questionSetId: true,
		skillName: true,
		title: true,
		description: true,
		cefrLevel: true,
		estimatedMinutes: true,
		isActive: true,
		_count: {
			select: { items: true },
		},
	} satisfies Prisma.QuestionSetSelect,

	detail: {
		questionSetId: true,
		skillName: true,
		title: true,
		description: true,
		cefrLevel: true,
		estimatedMinutes: true,
		isActive: true,
		items: {
			orderBy: { position: 'asc' as const },
			select: {
				position: true,
				question: { select: QuestionSelect.detail },
			},
		},
	} satisfies Prisma.QuestionSetSelect,

	idTitle: {
		questionSetId: true,
		title: true,
	} satisfies Prisma.QuestionSetSelect,

	titleSkill: {
		questionSetId: true,
		title: true,
		skillName: true,
	} satisfies Prisma.QuestionSetSelect,

	skillOnly: {
		skillName: true,
	} satisfies Prisma.QuestionSetSelect,

	planAvailable: {
		questionSetId: true,
		title: true,
		skillName: true,
		cefrLevel: true,
		estimatedMinutes: true,
	} satisfies Prisma.QuestionSetSelect,

	assessmentMeta: {
		title: true,
		skillName: true,
		cefrLevel: true,
		items: { select: QuestionSetItemSelect.idOnly },
	} satisfies Prisma.QuestionSetSelect,
} as const;
