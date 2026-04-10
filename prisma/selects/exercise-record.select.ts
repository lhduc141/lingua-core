import { Prisma } from '@prisma/client';

export const ExerciseRecordSelect = {
	// Dùng cho history list
	history: {
		exerciseRecordId: true,
		refType: true,
		refId: true,
		status: true,
		score: true,
		startedAt: true,
		completedAt: true,
		createdAt: true,
	} satisfies Prisma.ExerciseRecordSelect,

	// Dùng cho result — bao gồm attempts + evaluations
	result: {
		exerciseRecordId: true,
		refType: true,
		refId: true,
		status: true,
		score: true,
		startedAt: true,
		completedAt: true,
		answers: {
			where: { deletedAt: null },
			orderBy: { submittedAt: 'asc' },
			select: {
				answerId: true,
				questionId: true,
				correct: true,
				score: true,
				gradingStatus: true,
				submittedAt: true,
				answerDetails: {
					select: {
						position: true,
						optionId: true,
						textAnswer: true,
					},
				},
				evaluations: {
					where: { deletedAt: null },
					take: 1,
					select: {
						answerEvalId: true,
						overallScore: true,
						criteriaJson: true,
					},
				},
				question: {
					select: {
						questionId: true,
						type: true,
						maxScore: true,
						translations: {
							where: { locale: 'en' },
							select: { stemText: true },
						},
						payload: {
							select: {
								answerKeysJson: true,
							},
						},
						options: {
							where: { deletedAt: null },
							select: {
								optionId: true,
								position: true,
								isCorrect: true,
								translations: {
									where: { locale: 'en' },
									select: { optionText: true },
								},
							},
						},
					},
				},
			},
		},
	} satisfies Prisma.ExerciseRecordSelect,

	performance: {
		refType: true,
		refId: true,
		score: true,
		completedAt: true,
	} satisfies Prisma.ExerciseRecordSelect,

	scoreHistory: {
		refType: true,
		refId: true,
		score: true,
		completedAt: true,
	} satisfies Prisma.ExerciseRecordSelect,

	timeRange: {
		startedAt: true,
		completedAt: true,
	} satisfies Prisma.ExerciseRecordSelect,

	recentActivity: {
		refType: true,
		refId: true,
		score: true,
		status: true,
		completedAt: true,
	} satisfies Prisma.ExerciseRecordSelect,

	completedOnly: {
		completedAt: true,
	} satisfies Prisma.ExerciseRecordSelect,

	idOnly: {
		exerciseRecordId: true,
	} satisfies Prisma.ExerciseRecordSelect,

	statusRef: {
		exerciseRecordId: true,
		status: true,
		refType: true,
		refId: true,
	} satisfies Prisma.ExerciseRecordSelect,

	placementCheck: {
		exerciseRecordId: true,
		placementSessionId: true,
		status: true,
	} satisfies Prisma.ExerciseRecordSelect,

	userRef: {
		userId: true,
		refType: true,
		refId: true,
	} satisfies Prisma.ExerciseRecordSelect,
} as const;
