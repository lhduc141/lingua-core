// onboarding.service.ts

import type { JwtPayloadDto } from '@app/jwt';
import { NotFoundException, ResponseDto } from '@app/shared';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../../../prisma/prisma.service';
import { OnboardingSurveySelect } from '../../../../../../prisma/selects';
import { OnboardingSurveyDto } from '../dto/get-survey-me.dto';
import { SubmitSurveyResponseDto } from '../dto/submit-survey-response.dto';
import { SubmitSurveyDto } from '../dto/submit-survey.dto';

@Injectable()
export class OnboardingService {
	private readonly logger = new Logger(OnboardingService.name);
	constructor(private prisma: PrismaService) {}

	async getSurvey(userId: string): Promise<ResponseDto<OnboardingSurveyDto>> {
		const survey = await this.prisma.onboardingSurvey.findFirst({
			where: { userId, isActive: true },
			select: OnboardingSurveySelect.full,
		});
		if (!survey) throw new NotFoundException('No active survey found. Please complete the survey first.');

		return ResponseDto.success(OnboardingSurveyDto, survey, 'Lấy thông tin thành công');
	}

	async submitSurvey({ userId }: JwtPayloadDto, dto: SubmitSurveyDto): Promise<ResponseDto<SubmitSurveyResponseDto>> {
		const activeSurvey = await this.prisma.onboardingSurvey.findFirst({
			where: { userId, isActive: true },
			select: OnboardingSurveySelect.minimal,
		});
		const isUpdate = !!activeSurvey;

		const result = await this.prisma.$transaction(async (tx) => {
			if (activeSurvey) {
				await tx.onboardingSurvey.updateMany({
					where: { userId, isActive: true },
					data: { isActive: false },
				});
			}

			const newSurvey = await tx.onboardingSurvey.create({
				data: {
					userId,
					isActive: true, // New survey is active

					// TIER 1: REQUIRED
					primaryGoal: dto.primaryGoal,
					plannedStudyHoursPerWeek: dto.plannedStudyHoursPerWeek,
					availableDays: dto.availableDays ?? [],
					primaryFocusSkills: dto.primaryFocusSkills,

					// TIER 2: IMPORTANT
					targetDeadlineDate: dto.targetDeadlineDate ? new Date(dto.targetDeadlineDate) : null,
					targetGoal: dto.targetGoal,
					selfAssessedLevel: dto.selfAssessedLevel,
					usageContext: dto.usageContext,
					difficulties: dto.difficulties,

					// TIER 3: OPTIONAL
					additionalContext: dto.additionalContext,
					yearsStudied: dto.yearsStudied,
					previousLearningExperience: dto.previousLearningExperience,

					// CERTIFICATION
					targetCertification: dto.targetCertification,
					targetScore: dto.targetScore,

					// Timestamps
					completedAt: new Date(),
				},
				select: OnboardingSurveySelect.basic,
			});

			return { newSurvey, previousSurvey: activeSurvey };
		});

		const responseData = {
			surveyId: result.newSurvey.surveyId,
			completedAt: result.newSurvey.completedAt,
			isUpdate,
			message: isUpdate
				? 'Survey updated successfully. Previous version has been saved for your records.'
				: 'Survey submitted successfully. You can now take the placement test.',
			survey: {
				primaryGoal: result.newSurvey.primaryGoal,
				plannedStudyHoursPerWeek: result.newSurvey.plannedStudyHoursPerWeek,
				primaryFocusSkills: result.newSurvey.primaryFocusSkills as string[],
			},
		};

		return ResponseDto.success(SubmitSurveyResponseDto, responseData, responseData.message);
	}

	async getSurveyHistory(userId: string) {
		const surveys = await this.prisma.onboardingSurvey.findMany({
			where: { userId },
			select: OnboardingSurveySelect.basic,
			orderBy: { completedAt: 'desc' },
		});

		if (surveys.length === 0) throw new NotFoundException('No survey history found.');

		return {
			total: surveys.length,
			activeSurvey: surveys.find((s) => s.isActive),
			history: surveys,
		};
	}

	async skipSurvey(userId: string) {
		const now = new Date();

		await this.prisma.user.update({
			where: { userId },
			data: {
				surveySkippedAt: now,
				placementSkippedAt: now,
			},
		});

		await this.prisma.placementSession.updateMany({
			where: { userId, status: 'in_progress' },
			data: { status: 'abandoned' as any },
		});

		this.logger.log(`User ${userId} skipped onboarding`);
		return ResponseDto.success(Object, null, 'Onboarding skipped successfully');
	}

	// async isSurveyComplete(userId: string): Promise<boolean> {
	// 	const survey = await this.prisma.onboardingSurvey.findUnique({
	// 		where: { userId , isActive: true },
	// 		select: { completedAt: true },
	// 	});
	//
	// 	return !!survey?.completedAt;
	// }

	async getActiveSurvey(userId: string) {
		return this.prisma.onboardingSurvey.findFirst({
			where: { userId, isActive: true },
		});
	}

	async compareSurveyChanges(userId: string) {
		const surveys = await this.prisma.onboardingSurvey.findMany({
			where: { userId },
			orderBy: { completedAt: 'desc' },
			take: 2,
		});

		if (surveys.length < 2) return null;

		const [current, previous] = surveys;

		return {
			goalChanged: current.primaryGoal !== previous.primaryGoal,
			hoursChanged: current.plannedStudyHoursPerWeek !== previous.plannedStudyHoursPerWeek,
			skillsChanged: JSON.stringify(current.primaryFocusSkills) !== JSON.stringify(previous.primaryFocusSkills),
			levelChanged: current.selfAssessedLevel !== previous.selfAssessedLevel,

			changes: {
				goal: { from: previous.primaryGoal, to: current.primaryGoal },
				hours: { from: previous.plannedStudyHoursPerWeek, to: current.plannedStudyHoursPerWeek },
				skills: { from: previous.primaryFocusSkills, to: current.primaryFocusSkills },
			},
		};
	}
}
