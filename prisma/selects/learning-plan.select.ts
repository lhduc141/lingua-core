import { Prisma } from '@prisma/client';

export const LearningPlanSelect = {
	// Dùng cho GET /current — full detail per item
	task: {
		itemId: true,
		title: true,
		description: true,
		rationale: true,
		itemType: true,
		refType: true,
		refId: true,
		status: true,
		dueDate: true,
		position: true,
		estimatedMinutes: true,
		skillName: true,
		weekNumber: true,
		submittedText: true,
		taskScore: true,
		userFeedback: true,
		feedbackSubmittedAt: true,
		planCycle: true,
		generatedAt: true,
	} satisfies Prisma.LearningPlanItemSelect,

	// Dùng cho history list — summary only
	history: {
		itemId: true,
		title: true,
		itemType: true,
		status: true,
		dueDate: true,
		skillName: true,
		weekNumber: true,
		planCycle: true,
		taskScore: true,
		generatedAt: true,
	} satisfies Prisma.LearningPlanItemSelect,

	// Dùng cho review item lookup
	review: {
		itemId: true,
		title: true,
		description: true,
		itemType: true,
		status: true,
		dueDate: true,
		weekNumber: true,
		planCycle: true,
		userFeedback: true,
		feedbackSubmittedAt: true,
	} satisfies Prisma.LearningPlanItemSelect,

	// Minimal — dùng cho plan item tracking (assessment link)
	minimal: {
		itemId: true,
		status: true,
		refType: true,
		refId: true,
		itemType: true,
	} satisfies Prisma.LearningPlanItemSelect,
} as const;

export const UserAvailabilitySelect = {
	list: {
		availabilityId: true,
		dow: true,
		startMinute: true,
		endMinute: true,
	} satisfies Prisma.UserAvailabilitySelect,
} as const;
