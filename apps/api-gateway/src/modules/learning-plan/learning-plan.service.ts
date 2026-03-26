import { AiClientService } from '@app/ai-client';
import { BullmqService } from '@app/bullmq';
import { BadRequestException, NotFoundException, PagingDataDto, ResponseDto } from '@app/shared';
import { PlanJob, PlanQueues } from '@app/shared/queues';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../../../prisma/prisma.service';
import {
	ExerciseRecordSelect,
	LearningPlanSelect,
	LessonSelect,
	OnboardingSurveySelect,
	PlacementSessionSelect,
	QuestionSetSelect,
} from '../../../../../prisma/selects';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { ListPlanHistoryDto } from './dto/list-plan-history.dto';
import { SubmitReviewFeedbackDto } from './dto/submit-review-feedback.dto';
import { UpdatePlanItemDto } from './dto/update-plan-item.dto';
import { AiPlanItem } from './interface/ai-plan-item.interface';
import { CurrentPlanResponse } from './interface/current-plan-response.interface';
import { GradeCustomActivityJobData } from './interface/grade-custom-activity-job-data.interface';
import { PlanDay } from './interface/plan-day.interface';
import { PlanHistoryItem } from './interface/plan-history-item.interface';
import { PlanTask } from './interface/plan-task.interface';

@Injectable()
export class LearningPlanService implements OnModuleInit {
	private readonly logger = new Logger(LearningPlanService.name);
	private readonly ASSESSED_TO_CEFR: Record<string, string> = {
		beginner: 'A1',
		elementary: 'A2',
		intermediate: 'B1',
		advanced: 'B2',
	};

	constructor(
		private readonly prisma: PrismaService,
		private readonly aiClient: AiClientService,
		private readonly bullmq: BullmqService,
	) {}

	onModuleInit() {
		this.bullmq.registerWorker<GradeCustomActivityJobData>(
			PlanQueues.PLAN_AI,
			(job: Job<GradeCustomActivityJobData>) => this.handleGradeCustomActivity(job),
		);
	}

	// 1. GET /learning-plan/current
	async getCurrentPlan(userId: string) {
		const latestItem = await this.prisma.learningPlanItem.findFirst({
			where: { userId, deletedAt: null },
			orderBy: [{ planCycle: 'desc' }, { weekNumber: 'desc' }],
			select: LearningPlanSelect.cycleWeek,
		});

		if (!latestItem || !latestItem.planCycle) {
			return ResponseDto.success(Object, null, 'No learning plan found. Generate one first.');
		}

		const { planCycle, weekNumber } = latestItem;

		const items = await this.prisma.learningPlanItem.findMany({
			where: { userId, planCycle, weekNumber, deletedAt: null },
			select: LearningPlanSelect.task,
			orderBy: [{ dueDate: 'asc' }, { position: 'asc' }],
		});

		if (items.length === 0) {
			return ResponseDto.success(Object, null, 'No plan items found for current week.');
		}

		const reviewItem = items.find((i) => i.itemType === 'weekly_review' && !i.description);
		if (reviewItem && reviewItem.dueDate) {
			const now = new Date();
			const dueDate = new Date(reviewItem.dueDate);
			if (now >= dueDate) {
				await this.autoGenerateWeeklyReview(userId, reviewItem.itemId, planCycle, weekNumber!);
				const updated = await this.prisma.learningPlanItem.findFirst({
					where: { itemId: reviewItem.itemId },
					select: LearningPlanSelect.task,
				});
				if (updated) {
					const idx = items.findIndex((i) => i.itemId === reviewItem.itemId);
					if (idx >= 0) items[idx] = updated;
				}
			}
		}

		const dayMap = new Map<string, typeof items>();
		for (const item of items) {
			const dateKey = item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : 'no-date';
			if (!dayMap.has(dateKey)) dayMap.set(dateKey, []);
			dayMap.get(dateKey)!.push(item);
		}

		const sortedDates = Array.from(dayMap.keys()).sort();
		const startDate = sortedDates[0] || '';
		let dayNumber = weekNumber === 2 ? 8 : 1;

		const days: PlanDay[] = sortedDates.map((dateKey) => {
			const dayItems = dayMap.get(dateKey)!;
			const tasks: PlanTask[] = dayItems.map((item) => ({
				itemId: item.itemId,
				title: item.title,
				description: item.description,
				rationale: item.rationale,
				itemType: item.itemType ?? '',
				refType: item.refType,
				refId: item.refId,
				status: item.status as string,
				estimatedMinutes: item.estimatedMinutes,
				skillName: item.skillName,
				submittedText: item.submittedText,
				taskScore: item.taskScore !== null ? Number(item.taskScore) : null,
				userFeedback: item.userFeedback,
				feedbackSubmittedAt: item.feedbackSubmittedAt,
			}));

			const completedTasks = tasks.filter((t) => t.status === 'completed').length;
			const totalTasks = tasks.length;
			const dayStatus =
				completedTasks === totalTasks && totalTasks > 0
					? ('completed' as const)
					: completedTasks > 0
						? ('in_progress' as const)
						: ('pending' as const);

			return { day: dayNumber++, date: dateKey, totalTasks, completedTasks, status: dayStatus, tasks };
		});

		const totalTasks = items.length;
		const completedTasks = items.filter((i) => i.status === 'completed').length;
		const completedDays = days.filter((d) => d.status === 'completed').length;
		const endDate = sortedDates[sortedDates.length - 1] || startDate;

		const response: CurrentPlanResponse = {
			planCycle,
			weekNumber: weekNumber!,
			startDate,
			endDate,
			totalDays: days.length,
			completedDays,
			overallProgress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 1000) / 10 : 0,
			days,
		};

		return ResponseDto.success(Object, response);
	}

	// 2. POST /learning-plan/generate
	async generatePlan(userId: string, dto: GeneratePlanDto) {
		const catSession = await this.prisma.placementSession.findFirst({
			where: { userId, status: 'completed' },
			orderBy: { completedAt: 'desc' },
			select: PlacementSessionSelect.latestResult,
		});
		if (!catSession) {
			throw new BadRequestException('Please complete a placement test before generating a learning plan.');
		}

		const survey = await this.prisma.onboardingSurvey.findFirst({
			where: { userId, isActive: true, deletedAt: null },
			select: OnboardingSurveySelect.planInput,
		});
		if (!survey) {
			throw new BadRequestException('Please complete the onboarding survey before generating a learning plan.');
		}

		const { planCycle, weekNumber } = await this.determinePlanPhase(userId, dto.phase);

		if (!(planCycle === 1 && weekNumber === 1)) {
			await this.checkReviewGate(userId);
		}

		const availableContent = await this.getAvailableContent();
		const recentPerformance = await this.getRecentPerformance(userId);
		const previousWeekReview = weekNumber === 2 ? await this.getLatestReviewData(userId, planCycle) : null;
		const latestFeedback = weekNumber === 2 ? await this.getLatestUserFeedback(userId, planCycle) : null;

		const aiPayload = {
			cefrLevel: catSession.cefrLevel,
			goals: {
				primaryGoal: survey.primaryGoal,
				focusSkills: survey.primaryFocusSkills,
				plannedStudyHoursPerWeek: survey.plannedStudyHoursPerWeek,
				availableDays: survey.availableDays,
				targetGoal: survey.targetGoal,
			},
			currentCycle: planCycle,
			weekNumber,
			recentPerformance,
			previousWeekReview,
			userFeedback: latestFeedback,
			availableContent,
		};

		let aiResult: { planItems: AiPlanItem[] };
		try {
			aiResult = await this.aiClient.generatePlan(aiPayload);
		} catch (err) {
			this.logger.error(`AI plan generation failed: ${err.message}`);
			throw new BadRequestException('AI plan generation failed. Please try again.');
		}

		if (!aiResult?.planItems || aiResult.planItems.length === 0) {
			throw new BadRequestException('AI returned empty plan. Please try again.');
		}

		const startDate = new Date();
		startDate.setHours(0, 0, 0, 0);

		const now = new Date();
		const planItems = aiResult.planItems.map((item) => {
			const dayOffset = item.day - (weekNumber === 2 ? 8 : 1);
			const dueDate = new Date(startDate);
			dueDate.setDate(dueDate.getDate() + dayOffset);

			return {
				userId,
				title: item.title,
				description: item.description,
				rationale: item.rationale,
				itemType: item.itemType,
				refType:
					item.itemType === 'custom_activity' ? null : item.itemType === 'lesson' ? 'lesson' : 'question_set',
				refId: item.refId,
				dueDate,
				position: item.position,
				status: 'pending' as any,
				planCycle,
				weekNumber,
				generatedAt: now,
				estimatedMinutes: item.estimatedMinutes,
				skillName: item.skillName,
			};
		});

		const reviewDueDate = new Date(startDate);
		reviewDueDate.setDate(reviewDueDate.getDate() + 6);

		planItems.push({
			userId,
			title: `Weekly Review — Tuần ${weekNumber}`,
			description: null as any,
			rationale: 'Nhìn lại tiến độ tuần qua và lên kế hoạch tuần tiếp theo.',
			itemType: 'weekly_review',
			refType: null,
			refId: null,
			dueDate: reviewDueDate,
			position: 99,
			status: 'pending' as any,
			planCycle,
			weekNumber,
			generatedAt: now,
			estimatedMinutes: 10,
			skillName: null,
		});

		await this.prisma.learningPlanItem.createMany({ data: planItems });

		this.logger.log(
			`Plan generated | userId=${userId} | cycle=${planCycle} | week=${weekNumber} | items=${planItems.length}`,
		);

		return ResponseDto.success(
			Object,
			{ planCycle, weekNumber, itemsCreated: planItems.length },
			`Learning plan cycle ${planCycle} week ${weekNumber} generated successfully.`,
		);
	}

	// 3. POST /learning-plan/review/:itemId/feedback
	async submitReviewFeedback(userId: string, itemId: string, dto: SubmitReviewFeedbackDto) {
		const item = await this.prisma.learningPlanItem.findFirst({
			where: { itemId, userId, deletedAt: null },
			select: LearningPlanSelect.review,
		});

		if (!item) throw new NotFoundException('Review item not found');
		if (item.itemType !== 'weekly_review') {
			throw new BadRequestException('This item is not a weekly review');
		}
		if (!item.description) {
			throw new BadRequestException(
				'Weekly review has not been generated yet. Please wait until the review date.',
			);
		}
		if (item.feedbackSubmittedAt) {
			throw new BadRequestException('Feedback has already been submitted for this review');
		}

		await this.prisma.learningPlanItem.update({
			where: { itemId },
			data: {
				userFeedback: dto.userFeedback ?? null,
				feedbackSubmittedAt: new Date(),
				status: 'completed' as any,
			},
		});

		this.logger.log(`Review feedback submitted | userId=${userId} | itemId=${itemId}`);

		return ResponseDto.success(
			Object,
			{ itemId, feedbackSubmittedAt: new Date(), canGenerateNextWeek: true },
			"Feedback submitted. You can now generate the next week's plan.",
		);
	}

	// 4. PATCH /learning-plan/items/:itemId
	async updatePlanItem(userId: string, itemId: string, dto: UpdatePlanItemDto) {
		const item = await this.prisma.learningPlanItem.findFirst({
			where: { itemId, userId, deletedAt: null },
			select: LearningPlanSelect.minimal,
		});

		if (!item) throw new NotFoundException('Plan item not found');

		if (item.itemType === 'weekly_review') {
			throw new BadRequestException('Use POST /learning-plan/review/:itemId/feedback for weekly reviews');
		}

		if (['completed', 'skipped'].includes(item.status as string)) {
			throw new BadRequestException(`Item is already ${item.status}`);
		}

		const updateData: any = { status: dto.status as any };

		if (dto.submittedText && item.itemType === 'custom_activity') {
			updateData.submittedText = dto.submittedText;

			if (dto.status === 'completed') {
				await this.bullmq.addJob<GradeCustomActivityJobData>(
					PlanQueues.PLAN_AI,
					PlanJob.GRADE_CUSTOM_ACTIVITY,
					{ itemId, textAnswer: dto.submittedText },
				);
				this.logger.log(`Custom activity queued for grading | itemId=${itemId}`);
			}
		}

		await this.prisma.learningPlanItem.update({
			where: { itemId },
			data: updateData,
		});

		return ResponseDto.success(Object, { itemId, status: dto.status }, 'Plan item updated');
	}

	// 5. GET /learning-plan/history
	async getHistory(userId: string, dto: ListPlanHistoryDto) {
		const { pageIndex, pageSize } = dto;

		const allItems = await this.prisma.learningPlanItem.findMany({
			where: { userId, deletedAt: null, planCycle: { not: null } },
			select: LearningPlanSelect.historyAggregate,
			orderBy: [{ planCycle: 'desc' }, { weekNumber: 'desc' }],
		});

		const groups = new Map<string, typeof allItems>();
		for (const item of allItems) {
			const key = `${item.planCycle}-${item.weekNumber}`;
			if (!groups.has(key)) groups.set(key, []);
			groups.get(key)!.push(item);
		}

		const rows: PlanHistoryItem[] = Array.from(groups.entries()).map(([key, items]) => {
			const [cycleStr, weekStr] = key.split('-');
			const totalTasks = items.length;
			const completedTasks = items.filter((i) => i.status === 'completed').length;
			const skippedTasks = items.filter((i) => i.status === 'skipped').length;

			const dates = items.filter((i) => i.dueDate).map((i) => new Date(i.dueDate!));
			const startDate = dates.length > 0 ? new Date(Math.min(...dates.map((d) => d.getTime()))) : new Date();
			const endDate = dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : new Date();

			return {
				planCycle: Number(cycleStr),
				weekNumber: Number(weekStr),
				startDate: startDate.toISOString().split('T')[0],
				endDate: endDate.toISOString().split('T')[0],
				totalTasks,
				completedTasks,
				skippedTasks,
				progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 1000) / 10 : 0,
			};
		});

		const skip = (pageIndex - 1) * pageSize;
		const paged = rows.slice(skip, skip + pageSize);

		return ResponseDto.success(Object, new PagingDataDto({ count: rows.length, rows: paged }));
	}

	// PRIVATE: BullMQ Worker — Grade custom activity
	private async handleGradeCustomActivity(job: Job<GradeCustomActivityJobData>): Promise<void> {
		const { itemId, textAnswer } = job.data;

		if (!textAnswer || textAnswer.trim().length === 0) {
			await this.prisma.learningPlanItem.update({
				where: { itemId },
				data: { taskScore: 0 },
			});
			return;
		}

		try {
			const result = await this.aiClient.gradeSubmission({
				questionType: 'essay',
				userText: textAnswer,
			});

			await this.prisma.learningPlanItem.update({
				where: { itemId },
				data: { taskScore: result.overallScore },
			});

			this.logger.log(`Custom activity graded | itemId=${itemId} | score=${result.overallScore}`);
		} catch (err) {
			this.logger.error(`Custom activity grading failed | itemId=${itemId} | error=${err.message}`);
			throw err;
		}
	}

	// PRIVATE: Auto-generate weekly review
	private async autoGenerateWeeklyReview(
		userId: string,
		reviewItemId: string,
		planCycle: number,
		weekNumber: number,
	): Promise<void> {
		try {
			const weekItems = await this.prisma.learningPlanItem.findMany({
				where: {
					userId,
					planCycle,
					weekNumber,
					itemType: { not: 'weekly_review' },
					deletedAt: null,
				},
				select: LearningPlanSelect.weekItemSummary,
			});

			const completedTasks = weekItems.filter((i) => i.status === 'completed').length;
			const totalTasks = weekItems.length;
			const skippedTasks = weekItems.filter((i) => i.status === 'skipped').map((i) => i.title);

			const assessmentResults = await this.getWeekAssessmentResults(userId, weekItems);

			const catSession = await this.prisma.placementSession.findFirst({
				where: { userId, status: 'completed' },
				orderBy: { completedAt: 'desc' },
				select: PlacementSessionSelect.latestCefr,
			});

			const reviewData = await this.aiClient.generateWeeklyReview({
				cefrLevel: catSession?.cefrLevel ?? 'A2',
				weekNumber,
				planItems: weekItems,
				assessmentResults,
				completedTasks,
				totalTasks,
				skippedTasks,
			});

			await this.prisma.learningPlanItem.update({
				where: { itemId: reviewItemId },
				data: { description: JSON.stringify(reviewData) },
			});

			this.logger.log(`Weekly review generated | userId=${userId} | cycle=${planCycle} | week=${weekNumber}`);
		} catch (err) {
			this.logger.error(`Weekly review generation failed: ${err.message}`);
		}
	}

	// PRIVATE: Gate check
	private async checkReviewGate(userId: string): Promise<void> {
		const latestReview = await this.prisma.learningPlanItem.findFirst({
			where: { userId, itemType: 'weekly_review', deletedAt: null },
			orderBy: [{ planCycle: 'desc' }, { weekNumber: 'desc' }],
			select: LearningPlanSelect.reviewGate,
		});

		if (!latestReview) return;

		if (!latestReview.description) {
			const dueStr = latestReview.dueDate
				? new Date(latestReview.dueDate).toISOString().split('T')[0]
				: 'review date';
			throw new BadRequestException(`Weekly review chưa sẵn sàng. Vui lòng quay lại sau ngày ${dueStr}.`);
		}

		if (!latestReview.feedbackSubmittedAt) {
			throw new BadRequestException('Vui lòng gửi nhận xét tuần trước trước khi tạo kế hoạch mới.');
		}
	}

	// PRIVATE: Determine plan cycle + week
	private async determinePlanPhase(
		userId: string,
		requestedPhase?: 'week1' | 'week2',
	): Promise<{ planCycle: number; weekNumber: number }> {
		const latest = await this.prisma.learningPlanItem.findFirst({
			where: { userId, deletedAt: null, planCycle: { not: null } },
			orderBy: [{ planCycle: 'desc' }, { weekNumber: 'desc' }],
			select: LearningPlanSelect.cycleWeek,
		});

		if (!latest) return { planCycle: 1, weekNumber: 1 };

		const currentCycle = latest.planCycle!;
		const currentWeek = latest.weekNumber ?? 1;

		if (requestedPhase === 'week2' || currentWeek === 1) {
			const week2Exists = await this.prisma.learningPlanItem.count({
				where: { userId, planCycle: currentCycle, weekNumber: 2, deletedAt: null },
			});
			if (week2Exists === 0) {
				return { planCycle: currentCycle, weekNumber: 2 };
			}
		}

		return { planCycle: currentCycle + 1, weekNumber: 1 };
	}

	// PRIVATE: Gather available content for AI
	private async getAvailableContent() {
		const [lessons, questionSets] = await Promise.all([
			this.prisma.lesson.findMany({
				where: { deletedAt: null, status: 'published' },
				select: LessonSelect.planAvailable,
			}),
			this.prisma.questionSet.findMany({
				where: { deletedAt: null, isActive: true },
				select: QuestionSetSelect.planAvailable,
			}),
		]);

		return {
			lessons: lessons.map((l) => ({
				refId: l.lessonId,
				title: l.title,
				skillName: l.skillName,
				cefrLevel: l.cefrLevel,
				estimatedMinutes: l.estimatedMinutes,
			})),
			practiceSessions: questionSets.map((s) => ({
				refId: s.questionSetId,
				title: s.title,
				skillName: s.skillName,
				cefrLevel: s.cefrLevel,
				estimatedMinutes: s.estimatedMinutes,
			})),
		};
	}

	// PRIVATE: Get recent performance
	private async getRecentPerformance(userId: string) {
		const recentRecords = await this.prisma.exerciseRecord.findMany({
			where: { userId, status: 'scored', deletedAt: null },
			orderBy: { completedAt: 'desc' },
			take: 10,
			select: ExerciseRecordSelect.performance,
		});

		const results: any[] = [];
		for (const a of recentRecords) {
			let skillName: string | null = null;

			if (a.refType === 'lesson') {
				const lesson = await this.prisma.lesson.findFirst({
					where: { lessonId: a.refId },
					select: LessonSelect.skillOnly,
				});
				skillName = lesson?.skillName ?? null;
			} else if (a.refType === 'question_set') {
				const qs = await this.prisma.questionSet.findFirst({
					where: { questionSetId: a.refId },
					select: QuestionSetSelect.skillOnly,
				});
				skillName = qs?.skillName ?? null;
			}

			results.push({
				skillName,
				score: Number(a.score),
				date: a.completedAt?.toISOString().split('T')[0],
			});
		}

		return results;
	}

	// PRIVATE: Get latest review data
	private async getLatestReviewData(userId: string, planCycle: number) {
		const review = await this.prisma.learningPlanItem.findFirst({
			where: { userId, planCycle, weekNumber: 1, itemType: 'weekly_review', deletedAt: null },
			select: LearningPlanSelect.reviewGate,
		});

		if (!review?.description) return null;

		try {
			return JSON.parse(review.description);
		} catch {
			return null;
		}
	}

	// PRIVATE: Get user feedback
	private async getLatestUserFeedback(userId: string, planCycle: number): Promise<string | null> {
		const review = await this.prisma.learningPlanItem.findFirst({
			where: { userId, planCycle, weekNumber: 1, itemType: 'weekly_review', deletedAt: null },
			select: LearningPlanSelect.feedbackOnly,
		});

		return review?.userFeedback ?? null;
	}

	// PRIVATE: Get week assessment results
	private async getWeekAssessmentResults(userId: string, weekItems: any[]) {
		const refIds = weekItems.filter((i) => i.refId && i.refType).map((i) => i.refId);

		if (refIds.length === 0) return [];

		const records = await this.prisma.exerciseRecord.findMany({
			where: { userId, refId: { in: refIds }, status: 'scored', deletedAt: null },
			select: ExerciseRecordSelect.performance,
		});

		return records.map((a) => {
			const planItem = weekItems.find((i) => i.refId === a.refId);
			return {
				skillName: planItem?.skillName,
				score: Number(a.score),
				date: a.completedAt?.toISOString().split('T')[0],
			};
		});
	}
}
