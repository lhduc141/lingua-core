import { Prisma } from '@prisma/client';

export const OnboardingSurveySelect = {
	// GET /onboarding/survey - full information
	full: {
		surveyId: true,
		userId: true,

		// TIER 1
		primaryGoal: true,
		plannedStudyHoursPerWeek: true,
    primaryFocusSkills: true,
		availableDays: true,

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

	// Check survey active (isActive + completedAt) => Guard logic
	activeCheck: {
		surveyId: true,
		completedAt: true,
		primaryGoal: true,
		isActive: true,
	} satisfies Prisma.OnboardingSurveySelect,

	// Use for generalPlan() - lấy thông tin để AI tạo plan
	// selfAssessedLevel: fallback cefrLevel when user skip placement test
	planInput: {
		primaryGoal: true,
		plannedStudyHoursPerWeek: true,
    primaryFocusSkills: true,
		availableDays: true,
		targetGoal: true,
		selfAssessedLevel: true,
	} satisfies Prisma.OnboardingSurveySelect,
} as const;
