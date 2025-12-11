// onboarding.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'apps/api-gateway/prisma/prisma.service';
import { UpsertOnboardingSurveyDto } from './dto/upsert-onboarding-survey.dto';
import type { JwtPayloadDto } from '@app/jwt';

@Injectable()
export class OnboardingService {
	constructor(private prisma: PrismaService) {}

	async upsertSurvey(user: JwtPayloadDto, dto: UpsertOnboardingSurveyDto) {
		const { userId, email } = user;
		const {
			targetGoal,
			targetDeadlineDate,
			plannedStudyHoursPerWeek,
			primaryFocusSkills,
			selfAssessedLevel,
			usageContext,
			difficulties,
			metaJson,
			answers,
		} = dto;

		// Upsert survey
		const survey = await this.prisma.onboardingSurvey.upsert({
			where: { userId },
			create: {
				userId,
				targetGoal,
				targetDeadlineDate: targetDeadlineDate ? new Date(targetDeadlineDate) : null,
				plannedStudyHoursPerWeek,
				primaryFocusSkills,
				selfAssessedLevel,
				usageContext,
				difficulties,
				metaJson,
			},
			update: {
				targetGoal,
				targetDeadlineDate: targetDeadlineDate ? new Date(targetDeadlineDate) : null,
				plannedStudyHoursPerWeek,
				primaryFocusSkills,
				selfAssessedLevel,
				usageContext,
				difficulties,
				metaJson,
				updatedAt: new Date(),
			},
		});

		// Remove old answers → recreate
		if (answers && answers.length) {
			await this.prisma.onboardingSurveyAnswer.deleteMany({
				where: { surveyId: survey.surveyId },
			});

			await this.prisma.onboardingSurveyAnswer.createMany({
				data: answers.map((a) => ({
					surveyId: survey.surveyId,
					questionKey: a.key,
					answerValue: a.value,
					questionOrder: a.order ?? 0,
				})),
			});
		}

		return this.getSurvey(userId);
	}

	async getSurvey(userId: string) {
		return this.prisma.onboardingSurvey.findUnique({
			where: { userId },
			include: {
				answers: {
					orderBy: { questionOrder: 'asc' },
				},
			},
		});
	}
}
