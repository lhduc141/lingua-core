import { Prisma } from '@prisma/client';

export const OnboardingSurveySelect = {
	full: {
		surveyId: true,
		userId: true,

		// TIER 1
		primaryGoal: true,
		plannedStudyHoursPerWeek: true,
		primaryFocusSkills: true,

		// TIER 2
		targetDeadlineDate: true,
		targetGoal: true,
		selfAssessedLevel: true,
		usageContext: true,
		difficulties: true,

		// TIER 3
		additionalContext: true,
		yearsStudied: true,
		previousLearningExperience: true,

		// CERTIFICATION
		targetCertification: true,
		targetScore: true,

		// Timestamps
		completedAt: true,
		createdAt: true,
		updatedAt: true,
	} satisfies Prisma.OnboardingSurveySelect,

	basic: {
		surveyId: true,
		userId: true,
		primaryGoal: true,
		plannedStudyHoursPerWeek: true,
		primaryFocusSkills: true,
		isActive: true,
		completedAt: true,
		createdAt: true,
	} satisfies Prisma.OnboardingSurveySelect,

	history: {
		surveyId: true,
		primaryGoal: true,
		plannedStudyHoursPerWeek: true,
		primaryFocusSkills: true,
		selfAssessedLevel: true,
		isActive: true,
		completedAt: true,
		createdAt: true,
	} satisfies Prisma.OnboardingSurveySelect,

	minimal: {
		surveyId: true,
		completedAt: true,
	} satisfies Prisma.OnboardingSurveySelect,

	// Active check
	activeCheck: {
		surveyId: true,
		completedAt: true,
		primaryGoal: true,
		isActive: true,
	} satisfies Prisma.OnboardingSurveySelect,

	planInput: {
		primaryGoal: true,
		plannedStudyHoursPerWeek: true,
		primaryFocusSkills: true,
		targetGoal: true,
	} satisfies Prisma.OnboardingSurveySelect,
} as const;
