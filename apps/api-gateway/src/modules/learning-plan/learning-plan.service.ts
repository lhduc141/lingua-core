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

	private readonly WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
	private readonly SUPPORTED_SKILLS = ['reading', 'writing', 'speaking' /*, 'listening'*/];

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
		const { weekStartDate, weekEndDate, weekDates } = this.getCurrentVNWeekRange();

		const planCycle = Number(weekStartDate.replaceAll('-', ''));
		const weekNumber = 1;

		const items = await this.prisma.learningPlanItem.findMany({
			where: {
				userId,
				deletedAt: null,
				dueDate: {
					gte: this.vnDateToDate(weekStartDate),
					lt: this.vnDateToDate(this.addDays(weekStartDate, 7)),
				},
			},
			select: LearningPlanSelect.task,
			orderBy: [{ dueDate: 'asc' }, { position: 'asc' }],
		});

		if (items.length === 0) {
			return ResponseDto.success(Object, null, 'No learning plan found for current week. Generate one first.');
		}

		const reviewItem = items.find((i) => i.itemType === 'weekly_review' && !i.description);
		if (reviewItem && reviewItem.dueDate) {
			const nowVN = this.vnDateToDate(this.getVNToday());
			const reviewDueDate = this.vnDateToDate(this.toVNDateStr(new Date(reviewItem.dueDate)));

			const nonReviewItems = items.filter((i) => i.itemType !== 'weekly_review');
			const allDone =
				nonReviewItems.length > 0 &&
				nonReviewItems.every((i) => i.status === 'completed' || i.status === 'skipped');

			if (nowVN >= reviewDueDate || allDone) {
				await this.autoGenerateWeeklyReview(userId, reviewItem.itemId, planCycle, weekNumber);

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
		for (const date of weekDates) {
			dayMap.set(date.date, []);
		}

		for (const item of items) {
			const dateKey = item.dueDate ? this.toVNDateStr(new Date(item.dueDate)) : null;
			if (!dateKey || !dayMap.has(dateKey)) continue;
			dayMap.get(dateKey)!.push(item);
		}

		const days: PlanDay[] = weekDates.map((date) => {
			const dayItems = dayMap.get(date.date) ?? [];

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
				day: date.day,
				date: date.date,
				totalTasks,
				completedTasks,
				status: dayStatus,
				tasks,
			};
		});

		const totalTasks = items.length;
		const completedTasks = items.filter((i) => i.status === 'completed').length;
		const completedDays = days.filter((d) => d.status === 'completed').length;

		const response: CurrentPlanResponse = {
			planCycle,
			weekNumber,
			weekStartDate,
			weekEndDate,
			startDate: weekStartDate,
			endDate: weekEndDate,
			totalDays: 7,
			completedDays,
			overallProgress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 1000) / 10 : 0,
			days,
		};

		return ResponseDto.success(Object, response);
	}

	// 2. POST /learning-plan/generate
	async generatePlan(userId: string, _dto: GeneratePlanDto) {
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

		const { today, weekStartDate, weekEndDate, weekDates } = this.getCurrentVNWeekRange();

		const planCycle = Number(weekStartDate.replaceAll('-', ''));
		const weekNumber = 1;
		const startDateStr = weekStartDate;

		await this.prisma.learningPlanItem.updateMany({
			where: {
				userId,
				deletedAt: null,
				dueDate: {
					gte: this.vnDateToDate(weekStartDate),
					lt: this.vnDateToDate(this.addDays(weekStartDate, 7)),
				},
			},
			data: { deletedAt: new Date() },
		});

		const recentPerformance = await this.getRecentPerformance(userId);
		const recentWeaknesses = await this.getRecentWeaknesses(userId);
		this.logger.log(
			`Recent weaknesses extracted | userId=${userId} | count=${recentWeaknesses.length}` +
				(recentWeaknesses.length > 0 ? ` | tags=[${recentWeaknesses.map((w: any) => w.tag).join(',')}]` : ''),
		);
		const availableDays = this.normalizeAvailableDays(survey.availableDays);

		const rawFocusSkills = Array.isArray(survey.primaryFocusSkills)
			? survey.primaryFocusSkills.map((skill) => String(skill).trim().toLowerCase())
			: [];

		const hasAllSkills = rawFocusSkills.some((skill) => ['all', 'all_skills', 'all skills'].includes(skill));

		const sanitizedFocusSkills = rawFocusSkills.filter((skill) => this.SUPPORTED_SKILLS.includes(skill));

		const selectedFocusSkills = hasAllSkills
			? [...this.SUPPORTED_SKILLS]
			: sanitizedFocusSkills.length > 0
				? sanitizedFocusSkills
				: ['writing', 'speaking'];

		const planSkills = Array.from(new Set(['reading', 'writing', 'speaking', ...selectedFocusSkills])).filter(
			(skill) => this.SUPPORTED_SKILLS.includes(skill),
		);

		const rawWeeklyHours = Number(survey.plannedStudyHoursPerWeek ?? 7);
		const plannedStudyHoursPerWeek = Math.min(Math.max(rawWeeklyHours, 1), 14);
		const dailyMinutesLimit = Math.max(
			45,
			Math.ceil((plannedStudyHoursPerWeek / Math.max(availableDays.length, 1)) * 60),
		);

		const { lessons, questionSets, shortToFullMap } = await this.getAvailableContent(
			catSession.cefrLevel ?? 'B1',
			planSkills,
			userId,
			recentPerformance,
			weekStartDate,
		);

		const validRefIds = new Set<string>([
			...lessons.map((l: any) => l.lessonId),
			...questionSets.map((q: any) => q.questionSetId),
		]);

		const skillAvgMap: Record<string, { total: number; count: number }> = {};
		for (const r of recentPerformance) {
			if (!r.skillName) continue;
			if (!skillAvgMap[r.skillName]) skillAvgMap[r.skillName] = { total: 0, count: 0 };
			skillAvgMap[r.skillName].total += r.score;
			skillAvgMap[r.skillName].count += 1;
		}

		const skillPerformanceSummary = Object.entries(skillAvgMap).map(([skill, { total, count }]) => ({
			skill,
			avg: Math.round(total / count),
		}));

		const maxAiItems = Math.min(40, availableDays.length * 8);

		const aiLessons = this.shuffle(lessons).slice(0, maxAiItems);
		const aiQSets = this.shuffle(questionSets).slice(0, maxAiItems);

		const contentGroups: Record<string, string[]> = {};

		for (const l of aiLessons) {
			const key = `${l.cefrLevel}_${l.skillName}_LESSON`;
			if (!contentGroups[key]) contentGroups[key] = [];
			contentGroups[key].push(l.lessonId.split('-')[0]);
		}

		for (const q of aiQSets) {
			const key = `${q.cefrLevel}_${q.skillName}_PRACTICE`;
			if (!contentGroups[key]) contentGroups[key] = [];
			contentGroups[key].push(q.questionSetId.split('-')[0]);
		}

		const compactContent = Object.entries(contentGroups)
			.map(([k, ids]) => `${k}: ${ids.join(',')}`)
			.join('\n');

		if (!compactContent.trim()) {
			throw new BadRequestException('No available learning content found for your profile.');
		}

		const aiPayload = {
			cefrLevel: catSession.cefrLevel,
			goals: {
				focusSkills: selectedFocusSkills,
				planSkills,
				plannedStudyHoursPerWeek,
				availableDays,
			},
			weekStartDate,
			weekEndDate,
			weekDates,
			skillPerformance: skillPerformanceSummary,
			recentWeaknesses: recentWeaknesses.length > 0 ? recentWeaknesses : null,
			compactContent,
			dailyMinutesLimit,
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

		const now = new Date();

		const [lessonTitles, qsetTitles] = await Promise.all([
			this.prisma.lesson.findMany({
				where: { lessonId: { in: [...validRefIds] }, deletedAt: null },
				select: { lessonId: true, title: true },
			}),
			this.prisma.questionSet.findMany({
				where: { questionSetId: { in: [...validRefIds] }, deletedAt: null },
				select: { questionSetId: true, title: true },
			}),
		]);

		const titleMap = new Map<string, string>();
		for (const l of lessonTitles) titleMap.set(l.lessonId, l.title);
		for (const q of qsetTitles) titleMap.set(q.questionSetId, q.title);

		const weekdayByDay: Record<number, string> = {
			1: 'MONDAY',
			2: 'TUESDAY',
			3: 'WEDNESDAY',
			4: 'THURSDAY',
			5: 'FRIDAY',
			6: 'SATURDAY',
			7: 'SUNDAY',
		};

		const allowedSkills = new Set(planSkills);
		const dayTaskCount = new Map<number, number>();
		const dayMinutes = new Map<number, number>();

		const validAiItems = aiResult.planItems.filter((item) => {
			if (item.day < 1 || item.day > 7) {
				this.logger.warn(`Skipping item with invalid day: ${item.day}`);
				return false;
			}

			const itemType = item.itemType as string;
			if (!['lesson', 'practice_session', 'custom_activity'].includes(itemType)) {
				this.logger.warn(`Skipping invalid itemType: ${itemType}`);
				return false;
			}

			const weekday = weekdayByDay[item.day];
			if (!availableDays.includes(weekday)) {
				this.logger.warn(`Skipping item on unavailable day: day=${item.day} weekday=${weekday}`);
				return false;
			}

			const itemSkill = item.skillName ? String(item.skillName).toLowerCase() : null;
			if (itemSkill && !allowedSkills.has(itemSkill)) {
				this.logger.warn(`Skipping item outside allowed plan skills: ${item.title} | skill=${item.skillName}`);
				return false;
			}

			if (item.day === 7 && item.itemType !== 'practice_session') {
				this.logger.warn(`Skipping Sunday non-practice item: ${item.title}`);
				return false;
			}

			const currentCount = dayTaskCount.get(item.day) ?? 0;
			const maxTasks = item.day === 7 ? 2 : 4;

			if (currentCount >= maxTasks) {
				this.logger.warn(`Skipping item because day limit reached: day=${item.day}`);
				return false;
			}

			const currentMinutes = dayMinutes.get(item.day) ?? 0;
			const itemMinutes = Math.max(Number(item.estimatedMinutes ?? 0), 0);

			if (currentCount > 0 && currentMinutes + itemMinutes > dailyMinutesLimit) {
				this.logger.warn(
					`Skipping item because daily minutes limit reached: day=${item.day} current=${currentMinutes} item=${itemMinutes} limit=${dailyMinutesLimit}`,
				);
				return false;
			}

			dayTaskCount.set(item.day, currentCount + 1);
			dayMinutes.set(item.day, currentMinutes + itemMinutes);

			return true;
		});

		const selectedRefIds = new Set<string>();

		const planItems = validAiItems
			.filter((item) => {
				if (item.itemType === 'custom_activity') return true;

				if (!item.refId) {
					this.logger.warn(`Skipping item missing refId: "${item.title}"`);
					return false;
				}

				const rawRefId = String(item.refId ?? '').trim();
				const fullId = String(shortToFullMap.get(rawRefId) ?? rawRefId).trim();

				if (!validRefIds.has(fullId)) {
					this.logger.warn(`Skipping unknown refId: "${fullId}" (${item.title})`);
					return false;
				}

				if (selectedRefIds.has(fullId)) {
					this.logger.warn(`Skipping duplicate refId in generated plan: "${fullId}" (${item.title})`);
					return false;
				}

				item.refId = fullId;
				selectedRefIds.add(fullId);
				return true;
			})
			.map((item) => {
				const dayOffset = item.day - 1;
				const dueDate = this.vnDateToDate(this.addDays(startDateStr, dayOffset));

				return {
					userId,
					title: item.refId && titleMap.get(item.refId) ? titleMap.get(item.refId)! : item.title,
					description: item.description ?? null,
					rationale: item.rationale,
					itemType: item.itemType,
					refType:
						item.itemType === 'custom_activity'
							? null
							: item.itemType === 'lesson'
								? 'lesson'
								: 'question_set',
					refId: item.itemType === 'custom_activity' ? null : item.refId,
					dueDate,
					position: item.position,
					status: 'pending' as any,
					planCycle,
					weekNumber,
					generatedAt: now,
					estimatedMinutes: item.estimatedMinutes,
					skillName: item.skillName ? String(item.skillName).toLowerCase() : null,
				};
			});

		const finalPlanItems = planItems.filter((item) => {
			const dateStr = this.toVNDateStr(new Date(item.dueDate));
			const weekDate = weekDates.find((d) => d.date === dateStr);

			if (!weekDate) {
				this.logger.warn(`Dropping item outside current week: ${item.title} | date=${dateStr}`);
				return false;
			}

			if (!availableDays.includes(weekDate.weekday)) {
				this.logger.warn(`Dropping item on unavailable date: ${item.title} | ${weekDate.weekday}`);
				return false;
			}

			if (weekDate.day === 7 && item.itemType !== 'practice_session') {
				this.logger.warn(`Dropping Sunday non-practice item after mapping: ${item.title}`);
				return false;
			}

			return true;
		});

		if (finalPlanItems.length === 0) {
			throw new BadRequestException('AI returned no valid plan items after validation.');
		}

		const reviewDateStr = this.addDays(startDateStr, 6);
		const reviewDueDate = this.vnDateToDate(reviewDateStr);

		const itemsToCreate = [...finalPlanItems];

		itemsToCreate.push({
			userId,
			title: 'Weekly Review',
			description: null as any,
			rationale: 'Review weekly progress.',
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

		await this.prisma.learningPlanItem.createMany({ data: itemsToCreate });

		this.logger.log(
			`Plan generated | userId=${userId} | week=${weekStartDate}..${weekEndDate} | items=${itemsToCreate.length} | today=${today} | pool=L${lessons.length}+Q${questionSets.length} | sent=L${aiLessons.length}+Q${aiQSets.length} | focus=${selectedFocusSkills.join(',')} | planSkills=${planSkills.join(',')} | hours=${plannedStudyHoursPerWeek} | dailyLimit=${dailyMinutesLimit}`,
		);

		return ResponseDto.success(
			Object,
			{
				planCycle,
				weekNumber,
				weekStartDate,
				weekEndDate,
				itemsCreated: itemsToCreate.length,
			},
			`Learning plan for ${weekStartDate} to ${weekEndDate} generated successfully.`,
		);
	}

	// 3. POST /learning-plan/review/:itemId/feedback
	async submitReviewFeedback(userId: string, itemId: string, dto: SubmitReviewFeedbackDto) {
		const item = await this.prisma.learningPlanItem.findFirst({
			where: { itemId, userId, deletedAt: null },
			select: LearningPlanSelect.review,
		});

		if (!item) throw new NotFoundException('Review item not found');
		if (item.itemType !== 'weekly_review') throw new BadRequestException('This item is not a weekly review');

		if (!item.description) {
			throw new BadRequestException('Weekly review has not been generated yet. Please wait until review time.');
		}

		if (item.feedbackSubmittedAt) {
			throw new BadRequestException('Feedback has already been submitted for this review');
		}

		const feedbackSubmittedAt = new Date();

		await this.prisma.learningPlanItem.update({
			where: { itemId },
			data: {
				userFeedback: dto.userFeedback ?? null,
				feedbackSubmittedAt,
				status: 'completed' as any,
			},
		});

		this.logger.log(`Review feedback submitted | userId=${userId} | itemId=${itemId}`);

		return ResponseDto.success(
			Object,
			{ itemId, feedbackSubmittedAt, canGenerateNextWeek: false },
			'Feedback submitted.',
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
				startDate: this.toVNDateStr(startDate),
				endDate: this.toVNDateStr(endDate),
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

	// 6. DELETE /learning-plan/reset
	async resetPlan(userId: string) {
		const { weekStartDate } = this.getCurrentVNWeekRange();

		const result = await this.prisma.learningPlanItem.updateMany({
			where: {
				userId,
				deletedAt: null,
				dueDate: {
					gte: this.vnDateToDate(weekStartDate),
					lt: this.vnDateToDate(this.addDays(weekStartDate, 7)),
				},
			},
			data: { deletedAt: new Date() },
		});

		this.logger.warn(
			`Current week plan reset | userId=${userId} | weekStart=${weekStartDate} | affected=${result.count}`,
		);

		return ResponseDto.success(Object, { affected: result.count }, 'Current week plan reset successfully.');
	}

	// PRIVATE: BullMQ Worker
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

	// PRIVATE: Smart content pool
	private async getAvailableContent(
		cefrLevel: string,
		planSkills: string[],
		userId: string,
		recentPerformance: { skillName: string | null; score: number }[],
		currentWeekStartDate: string,
	): Promise<{ lessons: any[]; questionSets: any[]; shortToFullMap: Map<string, string> }> {
		const skillAvg: Record<string, { total: number; count: number }> = {};

		for (const r of recentPerformance) {
			if (!r.skillName) continue;
			if (!skillAvg[r.skillName]) skillAvg[r.skillName] = { total: 0, count: 0 };
			skillAvg[r.skillName].total += r.score;
			skillAvg[r.skillName].count += 1;
		}

		const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
		const safeCefrLevel = levels.includes(cefrLevel) ? cefrLevel : 'B1';
		const idx = levels.indexOf(safeCefrLevel);

		const getLevelRange = (skill: string): string[] => {
			const data = skillAvg[skill];
			if (!data) return [safeCefrLevel];

			const avg = data.total / data.count;
			if (avg < 50) return [levels[idx - 1] ?? safeCefrLevel, safeCefrLevel];
			if (avg >= 75) return [safeCefrLevel, levels[idx + 1] ?? safeCefrLevel];
			return [safeCefrLevel];
		};

		const currentWeekEndExclusive = this.addDays(currentWeekStartDate, 7);

		const [usedFromCurrentPlan, usedFromExercise] = await Promise.all([
			this.prisma.learningPlanItem.findMany({
				where: {
					userId,
					refId: { not: null },
					deletedAt: null,
					dueDate: {
						gte: this.vnDateToDate(currentWeekStartDate),
						lt: this.vnDateToDate(currentWeekEndExclusive),
					},
				},
				select: { refId: true },
			}),
			this.prisma.exerciseRecord.findMany({
				where: {
					userId,
					deletedAt: null,
					status: { in: ['scored', 'submitted'] },
				},
				select: { refId: true },
			}),
		]);

		const usedRefIds = new Set([
			...usedFromCurrentPlan.map((i) => i.refId!),
			...usedFromExercise.map((i) => i.refId),
		]);

		const [lessonsBySkill, qsetsBySkill] = await Promise.all([
			Promise.all(
				planSkills.map((skill) =>
					this.prisma.lesson.findMany({
						where: {
							deletedAt: null,
							status: 'published',
							skillName: skill as any,
							cefrLevel: { in: getLevelRange(skill) as any },
							lessonId: { notIn: [...usedRefIds] },
						},
						select: LessonSelect.planAvailable,
					}),
				),
			),
			Promise.all(
				planSkills.map((skill) =>
					this.prisma.questionSet.findMany({
						where: {
							deletedAt: null,
							isActive: true,
							skillName: skill as any,
							cefrLevel: { in: getLevelRange(skill) as any },
							questionSetId: { notIn: [...usedRefIds] },
						},
						select: QuestionSetSelect.planAvailable,
					}),
				),
			),
		]);

		const lessons = lessonsBySkill.flat();
		const questionSets = qsetsBySkill.flat();

		const shortToFullMap = new Map<string, string>();
		for (const l of lessons) shortToFullMap.set(l.lessonId.split('-')[0], l.lessonId);
		for (const q of questionSets) shortToFullMap.set(q.questionSetId.split('-')[0], q.questionSetId);

		this.logger.log(
			`Content pool | cefrLevel=${safeCefrLevel} | planSkills=${planSkills.join(',')} | lessons=${lessons.length} | qsets=${questionSets.length} | used=${usedRefIds.size}`,
		);

		return { lessons, questionSets, shortToFullMap };
	}

	// PRIVATE: Get recent performance
	// PRIVATE: Extract recent weaknesses from Writing/Speaking AI feedback
	private async getRecentWeaknesses(userId: string): Promise<any[]> {
		const records = await this.prisma.exerciseRecord.findMany({
			where: { userId, status: 'scored' as any, deletedAt: null },
			orderBy: { completedAt: 'desc' },
			take: 5,
			select: {
				completedAt: true,
				answers: {
					where: {
						deletedAt: null,
						gradingStatus: { in: ['auto_scored', 'ai_scored', 'human_reviewed'] as any },
					},
					select: {
						question: { select: { type: true } },
						evaluations: {
							where: { deletedAt: null },
							take: 1,
							select: { criteriaJson: true },
						},
					},
				},
			},
		});

		const CRITERION_TAG_MAP: Record<string, string> = {
			'Task Response': 'writing_task_response',
			'Coherence & Cohesion': 'writing_coherence_cohesion',
			'Lexical Resource': 'writing_vocabulary_range',
			'Grammatical Range & Accuracy': 'writing_grammar_accuracy',
			'Fluency & Coherence': 'speaking_fluency_coherence',
			Pronunciation: 'speaking_pronunciation',
		};

		const CORRECTION_TAG_MAP: Record<string, string> = {
			subject_verb_agreement: 'grammar_subject_verb_agreement',
			gerund_infinitive: 'grammar_verb_patterns',
			verb_pattern: 'grammar_verb_patterns',
			article: 'grammar_articles',
			preposition: 'grammar_prepositions',
		};

		const getBandSeverity = (band: number): 'low' | 'medium' | 'high' => {
			if (band < 5.5) return 'high';
			if (band < 6.0) return 'medium';
			return 'low';
		};

		const weaknesses: any[] = [];

		for (const record of records) {
			const date = record.completedAt?.toISOString().split('T')[0] ?? null;

			for (const ans of record.answers ?? []) {
				const questionType = ans.question?.type ?? '';
				if (!['essay', 'speaking'].includes(questionType)) continue;

				const evalRecord = ans.evaluations?.[0];
				if (!evalRecord?.criteriaJson) continue;

				let criteria: any;
				try {
					criteria =
						typeof evalRecord.criteriaJson === 'string'
							? JSON.parse(evalRecord.criteriaJson)
							: evalRecord.criteriaJson;
				} catch {
					continue;
				}

				const skill = questionType === 'essay' ? 'writing' : 'speaking';

				// Extract weak criterion bands (bandEstimate < 6.5)
				if (Array.isArray(criteria?.criterionBands)) {
					for (const band of criteria.criterionBands) {
						const bandScore = Number(band.bandEstimate ?? band.score ?? band.internalScore);
						if (!Number.isFinite(bandScore) || bandScore >= 6.5) continue;

						const criterionName = String(band.name ?? '');

						// Skill-specific tag: Speaking dùng speaking_* thay vì writing_*
						let tag = CRITERION_TAG_MAP[criterionName];
						if (skill === 'speaking') {
							if (criterionName === 'Lexical Resource') tag = 'speaking_vocabulary_range';
							if (criterionName === 'Grammatical Range & Accuracy') tag = 'speaking_grammar_accuracy';
						}
						if (!tag) continue;

						const existing = weaknesses.find((w) => w.tag === tag);
						if (!existing) {
							weaknesses.push({
								skill,
								criterion: criterionName,
								tag,
								severity: getBandSeverity(bandScore),
								score: bandScore,
								evidence: band.summary ?? band.weaknesses?.[0] ?? null,
								date,
							});
						}
					}
				}

				// Extract correction-based weaknesses (grammar categories)
				if (Array.isArray(criteria?.corrections)) {
					for (const correction of criteria.corrections.slice(0, 5)) {
						const category = String(correction.category ?? correction.type ?? '');
						const tag = CORRECTION_TAG_MAP[category];
						if (!tag) continue;

						const existing = weaknesses.find((w) => w.tag === tag);
						if (!existing && (correction.severity === 'medium' || correction.severity === 'high')) {
							weaknesses.push({
								skill,
								criterion: 'correction',
								tag,
								severity: correction.severity,
								score: null,
								evidence:
									correction.original && correction.corrected
										? `"${correction.original}" → "${correction.corrected}"`
										: null,
								date,
							});
						}
					}
				}
			}
		}

		return weaknesses.slice(0, 6);
	}

	private async getRecentPerformance(userId: string) {
		const recentRecords = await this.prisma.exerciseRecord.findMany({
			where: { userId, status: 'scored', deletedAt: null },
			orderBy: { completedAt: 'desc' },
			take: 5,
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

	// PRIVATE: Get week assessment results
	private async getWeekAssessmentResults(userId: string, weekItems: any[]) {
		const refIds = weekItems.filter((i) => i.refId && i.refType).map((i) => i.refId);
		if (refIds.length === 0) return [];

		const records = await this.prisma.exerciseRecord.findMany({
			where: {
				userId,
				refId: { in: refIds },
				status: 'scored' as any,
				deletedAt: null,
			},
			select: {
				refType: true,
				refId: true,
				score: true,
				completedAt: true,
				exerciseRecordId: true,
				answers: {
					where: {
						deletedAt: null,
						gradingStatus: { in: ['auto_scored', 'ai_scored', 'human_reviewed'] as any },
					},
					select: {
						answerId: true,
						score: true,
						gradingStatus: true,
						question: { select: { type: true } },
						evaluations: {
							where: { deletedAt: null },
							take: 1,
							select: { criteriaJson: true, overallScore: true },
						},
					},
				},
			},
		});

		return records.map((record) => {
			const planItem = weekItems.find((i) => i.refId === record.refId);

			const subjectiveAnswers =
				record.answers?.filter(
					(a) => ['essay', 'speaking'].includes(a.question?.type ?? '') && a.evaluations?.[0],
				) ?? [];

			const allCorrections: any[] = [];
			const dimensionMap: Record<string, { scores: number[]; comments: string[] }> = {};

			for (const ans of subjectiveAnswers) {
				const evalRecord = ans.evaluations[0];
				if (!evalRecord?.criteriaJson) continue;

				let criteria: any = null;

				try {
					criteria =
						typeof evalRecord.criteriaJson === 'string'
							? JSON.parse(evalRecord.criteriaJson)
							: evalRecord.criteriaJson;
				} catch {
					continue;
				}

				if (Array.isArray(criteria?.corrections)) {
					allCorrections.push(...criteria.corrections.slice(0, 3));
				}

				// Parse legacy dimensions shape (objective grading)
				if (Array.isArray(criteria?.dimensions)) {
					for (const dim of criteria.dimensions) {
						const name = dim.name ?? '';
						if (!dimensionMap[name]) dimensionMap[name] = { scores: [], comments: [] };
						if (dim.score != null) dimensionMap[name].scores.push(Number(dim.score));
						if (dim.comment) dimensionMap[name].comments.push(dim.comment);
					}
				}

				// Parse criterionBands shape (Writing/Speaking AI feedback)
				if (Array.isArray(criteria?.criterionBands)) {
					for (const band of criteria.criterionBands) {
						const name = (band.name ?? band.criterion ?? band.dimension ?? '') as string;
						if (!name) continue;

						if (!dimensionMap[name]) dimensionMap[name] = { scores: [], comments: [] };

						const score = band.bandEstimate ?? band.score ?? band.internalScore ?? null;
						if (score != null && !Number.isNaN(Number(score))) {
							dimensionMap[name].scores.push(Number(score));
						}

						const comment = band.summary ?? band.feedback ?? band.comment ?? band.diagnosis ?? null;
						if (comment) dimensionMap[name].comments.push(String(comment));

						// Include top weaknesses as additional comment context
						if (Array.isArray(band.weaknesses)) {
							for (const weakness of band.weaknesses.slice(0, 2)) {
								if (weakness) dimensionMap[name].comments.push(String(weakness));
							}
						}
					}
				}
			}

			const dimensions = Object.entries(dimensionMap).map(([name, { scores, comments }]) => ({
				name,
				avgScore:
					scores.length > 0
						? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
						: null,
				comment: comments[0] ?? null,
			}));

			return {
				skillName: planItem?.skillName,
				title: planItem?.title ?? null,
				score: Number(record.score),
				date: record.completedAt?.toISOString().split('T')[0],
				corrections: allCorrections.slice(0, 5),
				dimensions: dimensions.length > 0 ? dimensions : null,
			};
		});
	}

	// ─── DATE HELPERS: VN timezone = UTC+7 ─────────────────────────────────────

	private toVNDateStr(d: Date): string {
		const vnMs = d.getTime() + 7 * 60 * 60 * 1000;
		const vn = new Date(vnMs);
		const y = vn.getUTCFullYear();
		const m = String(vn.getUTCMonth() + 1).padStart(2, '0');
		const day = String(vn.getUTCDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}

	private getVNToday(): string {
		return this.toVNDateStr(new Date());
	}

	private getDayOfWeek(dateStr: string): number {
		const [y, m, d] = dateStr.split('-').map(Number);
		return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
	}

	private addDays(dateStr: string, days: number): string {
		const [y, m, d] = dateStr.split('-').map(Number);
		const result = new Date(Date.UTC(y!, m! - 1, d! + days));
		return result.toISOString().slice(0, 10);
	}

	private getMondayOfWeek(dateStr: string): string {
		const dow = this.getDayOfWeek(dateStr);
		const daysToMonday = dow === 0 ? 6 : dow - 1;
		return this.addDays(dateStr, -daysToMonday);
	}

	private vnDateToDate(dateStr: string): Date {
		return new Date(dateStr + 'T00:00:00+07:00');
	}

	private getCurrentVNWeekRange() {
		const today = this.getVNToday();
		const weekStartDate = this.getMondayOfWeek(today);
		const weekEndDate = this.addDays(weekStartDate, 6);

		const weekDates = this.WEEKDAYS.map((weekday, index) => ({
			day: index + 1,
			weekday,
			date: this.addDays(weekStartDate, index),
		}));

		return { today, weekStartDate, weekEndDate, weekDates };
	}

	private normalizeAvailableDays(rawDays: unknown): string[] {
		if (!Array.isArray(rawDays) || rawDays.length === 0) {
			return [...this.WEEKDAYS];
		}

		const normalized = rawDays.map((d) => String(d).trim().toUpperCase()).filter((d) => this.WEEKDAYS.includes(d));

		return normalized.length > 0 ? normalized : [...this.WEEKDAYS];
	}

	private shuffle<T>(arr: T[]): T[] {
		return [...arr].sort(() => Math.random() - 0.5);
	}
}
