import { Prisma } from '@prisma/client';

export const UserSelect = {
	profile: {
		userId: true,
		email: true,
		googleName: true,
		googleAvatarUrl: true,

		onboardingSurvey: { select: { surveyId: true }, take: 1 },
		catSessions: {
			select: { cefrLevel: true, status: true },
			where: { status: 'completed' },
			take: 1,
			orderBy: { createdAt: 'desc' },
		},

		dob: true,
		gender: true,
		phone: true,
		isAdmin: true,
		createdAt: true,
	} satisfies Prisma.UserSelect,

	authStatus: {
		userId: true,
		email: true,
		isAdmin: true,
		isActive: true,
		deletedAt: true,
		currentRefreshTokenHash: true,
		currentRefreshTokenExpiresAt: true,
	} satisfies Prisma.UserSelect,

	list: {
		userId: true,
		email: true,
		googleName: true,
		googleAvatarUrl: true,
		isActive: true,
		isAdmin: true,
		createdAt: true,
		lastLoginAt: true,
	} satisfies Prisma.UserSelect,
} as const;
