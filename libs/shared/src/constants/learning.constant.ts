export const SKILL_LIST = [
	{ name: 'reading', label: 'Reading', icon: 'book' },
	{ name: 'writing', label: 'Writing', icon: 'pen' },
	{ name: 'speaking', label: 'Speaking', icon: 'mic' },
];

export const LESSON_LIST_SELECT = {
	lessonId: true,
	skillName: true,
	title: true,
	description: true,
	cefrLevel: true,
	estimatedMinutes: true,
	status: true,
};

export const QUESTION_DETAIL_SELECT = {
	questionId: true,
	type: true,
	difficulty: true,
	maxScore: true,
	translations: {
		where: { locale: 'en' },
		select: {
			stemText: true,
			contentJson: true,
		},
	},
	options: {
		where: { deletedAt: null },
		orderBy: { position: 'asc' as const },
		select: {
			optionId: true,
			position: true,
			// isCorrect: false ← KHÔNG include
			translations: {
				where: { locale: 'en' },
				select: { optionText: true },
			},
		},
	},
	passage: {
		select: {
			passageId: true,
			title: true,
			content: true,
			cefrLevel: true,
			wordCount: true,
		},
	},
};
