import { Prisma } from '@prisma/client';

export const AssessmentSelect = {
	// Dùng cho history list
	history: {
		assessmentId: true,
		refType: true,
		refId: true,
		status: true,
		score: true,
		startedAt: true,
		completedAt: true,
		createdAt: true,
	} satisfies Prisma.AssessmentSelect,

	// Dùng cho result — bao gồm attempts + evaluations
	result: {
		assessmentId: true,
		refType: true,
		refId: true,
		status: true,
		score: true,
		startedAt: true,
		completedAt: true,
		attempts: {
			where: { deletedAt: null },
			select: {
				attemptId: true,
				questionId: true,
				modality: true,
				correct: true,
				score: true,
				gradingStatus: true,
				submittedAt: true,
				answers: {
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
						id: true,
						overallScore: true,
						criteriaJson: true,
					},
				},
				question: {
					select: {
						questionId: true,
						type: true,
						// isCorrect KHÔNG được include trong question.options — bảo mật
						options: {
							where: { deletedAt: null },
							select: {
								optionId: true,
								position: true,
								isCorrect: true, // cần để build correctOptionId trong result
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
	} satisfies Prisma.AssessmentSelect,

	performance: {
		refType: true,
		refId: true,
		score: true,
		completedAt: true,
	} satisfies Prisma.AssessmentSelect,

	scoreHistory: {
		refType: true,
		refId: true,
		score: true,
		completedAt: true,
	} satisfies Prisma.AssessmentSelect,

	timeRange: {
		startedAt: true,
		completedAt: true,
	} satisfies Prisma.AssessmentSelect,

	recentActivity: {
		refType: true,
		refId: true,
		score: true,
		status: true,
		completedAt: true,
	} satisfies Prisma.AssessmentSelect,

	completedOnly: {
		completedAt: true,
	} satisfies Prisma.AssessmentSelect,

	idOnly: {
		assessmentId: true,
	} satisfies Prisma.AssessmentSelect,

	statusRef: {
		assessmentId: true,
		status: true,
		refType: true,
		refId: true,
	} satisfies Prisma.AssessmentSelect,

	placementCheck: {
		assessmentId: true,
		catSessionId: true,
		status: true,
	} satisfies Prisma.AssessmentSelect,

	userRef: {
		userId: true,
		refType: true,
		refId: true,
	} satisfies Prisma.AssessmentSelect,
} as const;
