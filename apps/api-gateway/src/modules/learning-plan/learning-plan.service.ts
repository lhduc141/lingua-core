import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { BadRequestException, NotFoundException, PagingDataDto, ResponseDto } from '@app/shared';
import { AiClientService } from '@app/ai-client';
import { BullmqService } from '@app/bullmq';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { UpdatePlanItemDto } from './dto/update-plan-item.dto';
import { SubmitReviewFeedbackDto } from './dto/submit-review-feedback.dto';
import { ListPlanHistoryDto } from './dto/list-plan-history.dto';
import { PlanJob, PlanQueues } from '@app/shared/queues';
import { Job } from 'bullmq';
import { GradeCustomActivityJobData } from './interface/grade-custom-activity-job-data.interface';
import { LearningPlanSelect, UserAvailabilitySelect } from '../../../../../prisma/selects';
import { PlanDay } from './interface/plan-day.interface';
import { PlanTask } from './interface/plan-task.interface';
import { CurrentPlanResponse } from './interface/current-plan-response.interface';
import { AiPlanItem } from './interface/ai-plan-item.interface';
import { PlanHistoryItem } from './interface/plan-history-item.interface';
import { SetAvailabilityDto } from './dto/set-avaiability-slot.dto';

@Injectable()
export class LearningPlanService implements OnModuleInit {
	private readonly logger = new Logger(LearningPlanService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly aiClient: AiClientService,
		private readonly bullmq: BullmqService,
	) {}

	// Register BullMQ worker for custom activity grading
	onModuleInit() {
		this.bullmq.registerWorker<GradeCustomActivityJobData>(
			PlanQueues.PLAN_AI,
			(job: Job<GradeCustomActivityJobData>) => this.handleGradeCustomActivity(job),
		);
	}

	// ================================================================
	// 1. GET /learning-plan/current
	// ================================================================
	async getCurrentPlan(userId: string) {
		// Tìm cycle + week mới nhất
		const latestItem = await this.prisma.learningPlanItem.findFirst({
			where: { userId, deletedAt: null },
			orderBy: [{ planCycle: 'desc' }, { weekNumber: 'desc' }],
			select: { planCycle: true, weekNumber: true },
		});

		if (!latestItem || !latestItem.planCycle) {
			return ResponseDto.success(Object, null, 'No learning plan found. Generate one first.');
		}

		const { planCycle, weekNumber } = latestItem;

		// Lấy tất cả items thuộc cycle + week hiện tại
		const items = await this.prisma.learningPlanItem.findMany({
			where: {
				userId,
				planCycle,
				weekNumber,
				deletedAt: null,
			},
			select: LearningPlanSelect.task,
			orderBy: [{ dueDate: 'asc' }, { position: 'asc' }],
		});

		if (items.length === 0) {
			return ResponseDto.success(Object, null, 'No plan items found for current week.');
		}

		// Auto-generate weekly review nếu đến ngày
		const reviewItem = items.find((i) => i.itemType === 'weekly_review' && !i.description);
		if (reviewItem && reviewItem.dueDate) {
			const now = new Date();
			const dueDate = new Date(reviewItem.dueDate);
			if (now >= dueDate) {
				await this.autoGenerateWeeklyReview(userId, reviewItem.itemId, planCycle, weekNumber!);
				// Re-fetch items sau khi generate
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

		// Group items by dueDate → days
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

			return {
				day: dayNumber++,
				date: dateKey,
				totalTasks,
				completedTasks,
				status: dayStatus,
				tasks,
			};
		});

		const totalTasks = items.length;
		const completedTasks = items.filter((i) => i.status === 'completed').length;
		const completedDays = days.filter((d) => d.status === 'completed').length;

		const endDate = sortedDates[sortedDates.length - 1] || startDate;

		const response: CurrentPlanResponse = {
			planCycle: planCycle!,
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

	// ================================================================
	// 2. POST /learning-plan/generate
	// ================================================================
	async generatePlan(userId: string, dto: GeneratePlanDto) {
		// Preconditions: placement test completed + active survey
		const catSession = await this.prisma.catSession.findFirst({
			where: { userId, status: 'completed' },
			orderBy: { completedAt: 'desc' },
			select: { cefrLevel: true, finalTheta: true },
		});
		if (!catSession) {
			throw new BadRequestException('Please complete a placement test before generating a learning plan.');
		}

		const survey = await this.prisma.onboardingSurvey.findFirst({
			where: { userId, isActive: true, deletedAt: null },
			select: {
				primaryGoal: true,
				plannedStudyHoursPerWeek: true,
				primaryFocusSkills: true,
				targetGoal: true,
			},
		});
		if (!survey) {
			throw new BadRequestException('Please complete the onboarding survey before generating a learning plan.');
		}

		// Determine cycle + weekNumber
		const { planCycle, weekNumber } = await this.determinePlanPhase(userId, dto.phase);

		// Gate check: nếu không phải lần đầu, phải có feedback review trước
		if (!(planCycle === 1 && weekNumber === 1)) {
			await this.checkReviewGate(userId);
		}

		// Gather AI input
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
				targetGoal: survey.targetGoal,
			},
			currentCycle: planCycle,
			weekNumber,
			recentPerformance,
			previousWeekReview,
			userFeedback: latestFeedback,
			availableContent,
		};

		// Call AI
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

		// Calculate real dates for each day
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
					item.itemType === 'custom_activity'
						? null
						: item.itemType === 'lesson'
							? 'lesson'
							: 'practice_session',
				refId: item.refId,
				dueDate,
				position: item.position,
				status: 'pending' as any,
				autoGenerated: true,
				planCycle,
				weekNumber,
				generatedAt: now,
				estimatedMinutes: item.estimatedMinutes,
				skillName: item.skillName,
			};
		});

		// Add weekly review placeholder (last day of the week)
		const reviewDueDate = new Date(startDate);
		reviewDueDate.setDate(reviewDueDate.getDate() + 6); // Day 7 or Day 14 of week

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
			autoGenerated: true,
			planCycle,
			weekNumber,
			generatedAt: now,
			estimatedMinutes: 10,
			skillName: null,
		});

		// Persist
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

	// ================================================================
	// 3. POST /learning-plan/review/:itemId/feedback
	// ================================================================
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
			{
				itemId,
				feedbackSubmittedAt: new Date(),
				canGenerateNextWeek: true,
			},
			"Feedback submitted. You can now generate the next week's plan.",
		);
	}

	// ================================================================
	// 4. PATCH /learning-plan/items/:itemId
	// ================================================================
	async updatePlanItem(userId: string, itemId: string, dto: UpdatePlanItemDto) {
		const item = await this.prisma.learningPlanItem.findFirst({
			where: { itemId, userId, deletedAt: null },
			select: { itemId: true, status: true, itemType: true },
		});

		if (!item) throw new NotFoundException('Plan item not found');

		// weekly_review dùng endpoint riêng (review feedback)
		if (item.itemType === 'weekly_review') {
			throw new BadRequestException('Use POST /learning-plan/review/:itemId/feedback for weekly reviews');
		}

		if (['completed', 'skipped'].includes(item.status as string)) {
			throw new BadRequestException(`Item is already ${item.status}`);
		}

		const updateData: any = { status: dto.status as any };

		// Custom activity: save submitted text + trigger AI grading
		if (dto.submittedText && item.itemType === 'custom_activity') {
			updateData.submittedText = dto.submittedText;

			if (dto.status === 'completed') {
				// Push to BullMQ for AI grading
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

		// Lấy tất cả unique (planCycle, weekNumber) combinations
		const allItems = await this.prisma.learningPlanItem.findMany({
			where: { userId, deletedAt: null, planCycle: { not: null } },
			select: {
				planCycle: true,
				weekNumber: true,
				status: true,
				dueDate: true,
				taskScore: true,
			},
			orderBy: [{ planCycle: 'desc' }, { weekNumber: 'desc' }],
		});

		// Group by planCycle + weekNumber
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

		// Paginate
		const skip = (pageIndex - 1) * pageSize;
		const paged = rows.slice(skip, skip + pageSize);

		return ResponseDto.success(Object, new PagingDataDto({ count: rows.length, rows: paged }));
	}

	// ================================================================
	// 6. POST /learning-plan/availability
	// ================================================================
	async setAvailability(userId: string, dto: SetAvailabilityDto) {
		// Delete all existing → insert new (simple replace strategy)
		await this.prisma.$transaction([
			this.prisma.userAvailability.deleteMany({ where: { userId } }),
			this.prisma.userAvailability.createMany({
				data: dto.slots.map((slot) => ({
					userId,
					dow: slot.dow,
					startMinute: slot.startMinute,
					endMinute: slot.endMinute,
				})),
			}),
		]);

		this.logger.log(`Availability updated | userId=${userId} | slots=${dto.slots.length}`);

		return ResponseDto.success(Object, { slotsCount: dto.slots.length }, 'Availability updated');
	}

	// ================================================================
	// 7. GET /learning-plan/availability
	// ================================================================
	async getAvailability(userId: string) {
		const slots = await this.prisma.userAvailability.findMany({
			where: { userId, deletedAt: null },
			select: UserAvailabilitySelect.list,
			orderBy: [{ dow: 'asc' }, { startMinute: 'asc' }],
		});

		return ResponseDto.success(Object, { slots });
	}

	// ================================================================
	// PRIVATE: BullMQ Worker — Grade custom activity
	// ================================================================
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
			throw err; // Let BullMQ retry
		}
	}

	// ================================================================
	// PRIVATE: Auto-generate weekly review
	// ================================================================
	private async autoGenerateWeeklyReview(
		userId: string,
		reviewItemId: string,
		planCycle: number,
		weekNumber: number,
	): Promise<void> {
		try {
			// Gather performance data for this week
			const weekItems = await this.prisma.learningPlanItem.findMany({
				where: {
					userId,
					planCycle,
					weekNumber,
					itemType: { not: 'weekly_review' },
					deletedAt: null,
				},
				select: {
					title: true,
					itemType: true,
					status: true,
					skillName: true,
					taskScore: true,
					refType: true,
					refId: true,
				},
			});

			const completedTasks = weekItems.filter((i) => i.status === 'completed').length;
			const totalTasks = weekItems.length;
			const skippedTasks = weekItems.filter((i) => i.status === 'skipped').map((i) => i.title);

			// Get assessment results from this week
			const assessmentResults = await this.getWeekAssessmentResults(userId, weekItems);

			const catSession = await this.prisma.catSession.findFirst({
				where: { userId, status: 'completed' },
				orderBy: { completedAt: 'desc' },
				select: { cefrLevel: true },
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

			// Save review to description as JSON
			await this.prisma.learningPlanItem.update({
				where: { itemId: reviewItemId },
				data: { description: JSON.stringify(reviewData) },
			});

			this.logger.log(`Weekly review generated | userId=${userId} | cycle=${planCycle} | week=${weekNumber}`);
		} catch (err) {
			this.logger.error(`Weekly review generation failed: ${err.message}`);
			// Non-blocking: review generation failure should not break /current
		}
	}

	// ================================================================
	// PRIVATE: Gate check — review + feedback required
	// ================================================================
	private async checkReviewGate(userId: string): Promise<void> {
		const latestReview = await this.prisma.learningPlanItem.findFirst({
			where: {
				userId,
				itemType: 'weekly_review',
				deletedAt: null,
			},
			orderBy: [{ planCycle: 'desc' }, { weekNumber: 'desc' }],
			select: { description: true, feedbackSubmittedAt: true, dueDate: true },
		});

		if (!latestReview) return; // Lần đầu, không cần gate

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

	// ================================================================
	// PRIVATE: Determine plan cycle + week
	// ================================================================
	private async determinePlanPhase(
		userId: string,
		requestedPhase?: 'week1' | 'week2',
	): Promise<{ planCycle: number; weekNumber: number }> {
		const latest = await this.prisma.learningPlanItem.findFirst({
			where: { userId, deletedAt: null, planCycle: { not: null } },
			orderBy: [{ planCycle: 'desc' }, { weekNumber: 'desc' }],
			select: { planCycle: true, weekNumber: true },
		});

		if (!latest) {
			return { planCycle: 1, weekNumber: 1 };
		}

		const currentCycle = latest.planCycle!;
		const currentWeek = latest.weekNumber ?? 1;

		if (requestedPhase === 'week2' || currentWeek === 1) {
			// Check items don't already exist for week 2 of this cycle
			const week2Exists = await this.prisma.learningPlanItem.count({
				where: { userId, planCycle: currentCycle, weekNumber: 2, deletedAt: null },
			});
			if (week2Exists === 0) {
				return { planCycle: currentCycle, weekNumber: 2 };
			}
		}

		// Both weeks exist → new cycle
		return { planCycle: currentCycle + 1, weekNumber: 1 };
	}

	// ================================================================
	// PRIVATE: Gather available content for AI
	// ================================================================
	private async getAvailableContent() {
		const [lessons, practiceSessions] = await Promise.all([
			this.prisma.lesson.findMany({
				where: { deletedAt: null, status: 'published' },
				select: { lessonId: true, title: true, skillName: true, cefrLevel: true, estimatedMinutes: true },
			}),
			this.prisma.practiceSession.findMany({
				where: { deletedAt: null, isActive: true },
				select: { sessionId: true, title: true, skillName: true, cefrLevel: true, estimatedMinutes: true },
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
			practiceSessions: practiceSessions.map((s) => ({
				refId: s.sessionId,
				title: s.title,
				skillName: s.skillName,
				cefrLevel: s.cefrLevel,
				estimatedMinutes: s.estimatedMinutes,
			})),
		};
	}

	// ================================================================
	// PRIVATE: Get recent assessment performance
	// ================================================================
	private async getRecentPerformance(userId: string) {
		const recentAssessments = await this.prisma.assessment.findMany({
			where: {
				userId,
				status: 'scored',
				deletedAt: null,
			},
			orderBy: { completedAt: 'desc' },
			take: 10,
			select: {
				refType: true,
				refId: true,
				score: true,
				completedAt: true,
			},
		});

		// Enrich with skill info
		const results: any[] = [];
		for (const a of recentAssessments) {
			let skillName: string | null = null;

			if (a.refType === 'lesson') {
				const lesson = await this.prisma.lesson.findFirst({
					where: { lessonId: a.refId },
					select: { skillName: true },
				});
				skillName = lesson?.skillName ?? null;
			} else if (a.refType === 'practice_session') {
				const session = await this.prisma.practiceSession.findFirst({
					where: { sessionId: a.refId },
					select: { skillName: true },
				});
				skillName = session?.skillName ?? null;
			}

			results.push({
				skillName,
				score: Number(a.score),
				date: a.completedAt?.toISOString().split('T')[0],
			});
		}

		return results;
	}

	// ================================================================
	// PRIVATE: Get latest review data (for week 2 generation)
	// ================================================================
	private async getLatestReviewData(userId: string, planCycle: number) {
		const review = await this.prisma.learningPlanItem.findFirst({
			where: {
				userId,
				planCycle,
				weekNumber: 1,
				itemType: 'weekly_review',
				deletedAt: null,
			},
			select: { description: true },
		});

		if (!review?.description) return null;

		try {
			return JSON.parse(review.description);
		} catch {
			return null;
		}
	}

	// ================================================================
	// PRIVATE: Get user feedback from latest review
	// ================================================================
	private async getLatestUserFeedback(userId: string, planCycle: number): Promise<string | null> {
		const review = await this.prisma.learningPlanItem.findFirst({
			where: {
				userId,
				planCycle,
				weekNumber: 1,
				itemType: 'weekly_review',
				deletedAt: null,
			},
			select: { userFeedback: true },
		});

		return review?.userFeedback ?? null;
	}

	// ================================================================
	// PRIVATE: Get week's assessment results (for weekly review)
	// ================================================================
	private async getWeekAssessmentResults(userId: string, weekItems: any[]) {
		const refIds = weekItems.filter((i) => i.refId && i.refType).map((i) => i.refId);

		if (refIds.length === 0) return [];

		const assessments = await this.prisma.assessment.findMany({
			where: {
				userId,
				refId: { in: refIds },
				status: 'scored',
				deletedAt: null,
			},
			select: {
				refType: true,
				refId: true,
				score: true,
				completedAt: true,
			},
		});

		return assessments.map((a) => {
			const planItem = weekItems.find((i) => i.refId === a.refId);
			return {
				skillName: planItem?.skillName,
				score: Number(a.score),
				date: a.completedAt?.toISOString().split('T')[0],
			};
		});
	}
}
