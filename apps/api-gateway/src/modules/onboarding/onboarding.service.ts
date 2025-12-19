// onboarding.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'apps/api-gateway/prisma/prisma.service';
import { UpsertOnboardingSurveyDto } from './dto/upsert-onboarding-survey.dto';
import type { JwtPayloadDto } from '@app/jwt';
import { NotFoundException, ResponseDto } from '@app/shared';
import { OnboardingSurveyDto } from './dto/get-survey-me.dto';

@Injectable()
export class OnboardingService {
	constructor(private prisma: PrismaService) {}

	async getSurvey(userId: string): Promise<ResponseDto<OnboardingSurveyDto>> {
		const survey = await this.prisma.onboardingSurvey.findUnique({
			where: { userId },
			include: {
				// answers: { orderBy: { questionOrder: 'asc' } },
			},
		});
		if (!survey) throw NotFoundException;

		return ResponseDto.success(OnboardingSurveyDto, survey, 'Lấy thông tin thành công');
	}

	async upsertSurvey(user: JwtPayloadDto, dto: UpsertOnboardingSurveyDto): Promise<ResponseDto<OnboardingSurveyDto>> {
		const targetDeadline = dto.targetDeadlineDate ? new Date(dto.targetDeadlineDate) : null;

		const baseData = {
			primaryGoal: dto.targetGoal,
			// targetDeadlineDate: targetDeadline,
			// plannedStudyHoursPerWeek: dto.plannedStudyHoursPerWeek,
			// primaryFocusSkills: dto.primaryFocusSkills,
			// selfAssessedLevel: dto.selfAssessedLevel,
			// usageContext: dto.usageContext,
			// difficulties: dto.difficulties,
			// metaJson: dto.metaJson,
		};

		// const survey = await this.prisma.onboardingSurvey.upsert({
		// 	where: { userId: user.userId },
		// 	create: { userId: user.userId, ...baseData },
		// 	update: { ...baseData, updatedAt: new Date() },
		// });

		if (dto.answers?.length) {
			await this.prisma.$transaction([
				// this.prisma.onboardingSurvey.deleteMany({
				// 	where: { surveyId: survey.surveyId },
				// }),
				// this.prisma.onboardingSurvey.createMany({
					// data: dto.answers.map((a) => ({
					// 	surveyId: survey.surveyId,
					// 	questionKey: a.key,
					// 	answerValue: a.value,
					// 	questionOrder: a.order ?? 0,
					// })),
				// }),
			]);
		}

		return this.getSurvey(user.userId);
	}
}
