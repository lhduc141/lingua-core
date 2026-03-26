import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { BadRequestException, ResponseDto } from '@app/shared';
import {
	ExerciseRecordSelect,
	LearningPlanSelect,
	LessonSelect,
	PlacementSessionSelect,
	QuestionSetSelect,
} from '../../../../../prisma/selects';
import { GetStudyTimeDto } from './dto/get-study-time.dto';
import {
	ActivityDay,
	DailyStudyTime,
	DashboardOverview,
	RecentActivityItem,
	ScoreHistoryPoint,
	SkillProgress,
	SkillSummaryItem,
	StreakData,
	StudyTimeData,
} from './interface/dashboard.interface';

const VALID_SKILLS = ['reading', 'writing', 'speaking'];

@Injectable()
export class DashboardService {
	private readonly logger = new Logger(DashboardService.name);

	constructor(private readonly prisma: PrismaService) {}

	// 1. GET /dashboard/overview
	async getOverview(userId: string) {
		const [
			cefrData,
			planProgress,
			skillSummary,
			streak,
			vocabularyCount,
			totalAssessments,
			totalStudyMinutes,
			recentActivity,
		] = await Promise.all([
			this.getCefrData(userId),
			this.getPlanProgress(userId),
			this.getSkillSummary(userId),
			this.calculateStreak(userId),
			this.getVocabularyCount(userId),
			this.getTotalAssessments(userId),
			this.getTotalStudyMinutes(userId),
			this.getRecentActivity(userId),
		]);

		const overview: DashboardOverview = {
			cefrLevel: cefrData.cefrLevel,
			cefrConfidence: cefrData.confidence,
			currentPlanCycle: planProgress?.planCycle ?? null,
			planProgress: planProgress
				? {
						totalItems: planProgress.total,
						completedItems: planProgress.completed,
						percentage:
							planProgress.total > 0
								? Math.round((planProgress.completed / planProgress.total) * 1000) / 10
								: 0,
					}
				: null,
			skillSummary,
			streak,
			vocabularyCount,
			totalAssessments,
			totalStudyMinutes,
			recentActivity,
		};

		return ResponseDto.success(Object, overview);
	}

	// 2. GET /dashboard/skills/:skillName/progress
	async getSkillProgress(userId: string, skillName: string) {
		if (!VALID_SKILLS.includes(skillName)) {
			throw new BadRequestException(`Invalid skill: ${skillName}. Valid skills: ${VALID_SKILLS.join(', ')}`);
		}

		const scoreHistory = await this.getScoreHistoryForSkill(userId, skillName);

		const assessmentCount = scoreHistory.length;
		const avgScore =
			assessmentCount > 0
				? Math.round((scoreHistory.reduce((s, h) => s + h.score, 0) / assessmentCount) * 10) / 10
				: null;

		const trend = this.calculateTrend(scoreHistory.map((h) => h.score));

		const [planItemsTotal, planItemsCompleted] = await Promise.all([
			this.prisma.learningPlanItem.count({
				where: { userId, skillName, deletedAt: null, itemType: { not: 'weekly_review' } },
			}),
			this.prisma.learningPlanItem.count({
				where: { userId, skillName, deletedAt: null, status: 'completed', itemType: { not: 'weekly_review' } },
			}),
		]);

		const result: SkillProgress = {
			skillName,
			avgScore,
			assessmentCount,
			trend,
			scoreHistory,
			planItemsCompleted,
			planItemsTotal,
		};

		return ResponseDto.success(Object, result);
	}

	// 3. GET /dashboard/streak
	async getStreak(userId: string) {
		const streak = await this.calculateStreak(userId);

		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		thirtyDaysAgo.setHours(0, 0, 0, 0);

		const activityCalendar = await this.getActivityCalendar(userId, thirtyDaysAgo);
		const lastActiveDate = activityCalendar.length > 0 ? activityCalendar[activityCalendar.length - 1].date : null;

		const result: StreakData = {
			currentDays: streak.currentDays,
			longestDays: streak.longestDays,
			lastActiveDate,
			activityCalendar,
		};

		return ResponseDto.success(Object, result);
	}

	// 4. GET /dashboard/study-time
	async getStudyTime(userId: string, dto: GetStudyTimeDto) {
		const period = dto.period ?? 'week';

		const startDate = new Date();
		startDate.setHours(0, 0, 0, 0);

		if (period === 'week') startDate.setDate(startDate.getDate() - 7);
		else if (period === 'month') startDate.setDate(startDate.getDate() - 30);
		else startDate.setDate(startDate.getDate() - 365);

		const records = await this.prisma.exerciseRecord.findMany({
			where: {
				userId,
				deletedAt: null,
				status: { in: ['scored', 'submitted'] },
				startedAt: { gte: startDate },
				completedAt: { not: null },
			},
			select: ExerciseRecordSelect.timeRange,
			orderBy: { startedAt: 'asc' },
		});

		const dayMap = new Map<string, { minutes: number; count: number }>();

		for (const a of records) {
			if (!a.startedAt || !a.completedAt) continue;
			const durationMs = a.completedAt.getTime() - a.startedAt.getTime();
			const minutes = Math.max(0, Math.round(durationMs / 60000));
			const cappedMinutes = Math.min(minutes, 120);

			const dateKey = a.startedAt.toISOString().split('T')[0];
			const existing = dayMap.get(dateKey) ?? { minutes: 0, count: 0 };
			existing.minutes += cappedMinutes;
			existing.count += 1;
			dayMap.set(dateKey, existing);
		}

		const dailyBreakdown: DailyStudyTime[] = Array.from(dayMap.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([date, data]) => ({
				date,
				minutes: data.minutes,
				assessmentCount: data.count,
			}));

		const totalMinutes = dailyBreakdown.reduce((s, d) => s + d.minutes, 0);
		const daysInPeriod = period === 'week' ? 7 : period === 'month' ? 30 : dailyBreakdown.length || 1;
		const avgMinutesPerDay = Math.round((totalMinutes / daysInPeriod) * 10) / 10;

		const result: StudyTimeData = { period, totalMinutes, avgMinutesPerDay, dailyBreakdown };

		return ResponseDto.success(Object, result);
	}

	// PRIVATE: CEFR data
	private async getCefrData(userId: string): Promise<{ cefrLevel: string | null; confidence: number | null }> {
		const session = await this.prisma.placementSession.findFirst({
			where: { userId, status: 'completed' },
			orderBy: { completedAt: 'desc' },
			select: PlacementSessionSelect.cefrConfidence,
		});

		return {
			cefrLevel: session?.cefrLevel ?? null,
			confidence:
				session?.confidence !== null && session?.confidence !== undefined ? Number(session.confidence) : null,
		};
	}

	// PRIVATE: Current plan progress
	private async getPlanProgress(userId: string) {
		const latestItem = await this.prisma.learningPlanItem.findFirst({
			where: { userId, deletedAt: null, planCycle: { not: null } },
			orderBy: [{ planCycle: 'desc' }],
			select: LearningPlanSelect.cycleWeek,
		});

		if (!latestItem?.planCycle) return null;

		const items = await this.prisma.learningPlanItem.findMany({
			where: { userId, planCycle: latestItem.planCycle, deletedAt: null },
			select: LearningPlanSelect.statusOnly,
		});

		return {
			planCycle: latestItem.planCycle,
			total: items.length,
			completed: items.filter((i) => i.status === 'completed').length,
		};
	}

	// PRIVATE: Skill summary
	private async getSkillSummary(userId: string): Promise<Record<string, SkillSummaryItem>> {
		const summary: Record<string, SkillSummaryItem> = {};

		for (const skill of VALID_SKILLS) {
			const scores = await this.getScoreHistoryForSkill(userId, skill);
			const assessmentCount = scores.length;

			summary[skill] = {
				avgScore:
					assessmentCount > 0
						? Math.round((scores.reduce((s, h) => s + h.score, 0) / assessmentCount) * 10) / 10
						: null,
				assessmentCount,
				trend: this.calculateTrend(scores.map((s) => s.score)),
			};
		}

		return summary;
	}

	// PRIVATE: Score history for a specific skill
	private async getScoreHistoryForSkill(userId: string, skillName: string): Promise<ScoreHistoryPoint[]> {
		const [lessons, questionSets] = await Promise.all([
			this.prisma.lesson.findMany({
				where: { skillName: skillName as any, deletedAt: null },
				select: LessonSelect.idTitle,
			}),
			this.prisma.questionSet.findMany({
				where: { skillName: skillName as any, deletedAt: null },
				select: QuestionSetSelect.idTitle,
			}),
		]);

		const lessonIds = lessons.map((l) => l.lessonId);
		const questionSetIds = questionSets.map((s) => s.questionSetId);
		const allRefIds = [...lessonIds, ...questionSetIds];

		if (allRefIds.length === 0) return [];

		const records = await this.prisma.exerciseRecord.findMany({
			where: {
				userId,
				refId: { in: allRefIds },
				status: 'scored',
				deletedAt: null,
				score: { not: null },
			},
			select: ExerciseRecordSelect.scoreHistory,
			orderBy: { completedAt: 'asc' },
		});

		const titleMap = new Map<string, string>();
		for (const l of lessons) titleMap.set(l.lessonId, l.title);
		for (const s of questionSets) titleMap.set(s.questionSetId, s.title);

		return records.map((a) => ({
			date: a.completedAt?.toISOString().split('T')[0] ?? '',
			score: Number(a.score),
			refType: a.refType,
			refTitle: titleMap.get(a.refId) ?? null,
		}));
	}

	// PRIVATE: Calculate streak
	private async calculateStreak(userId: string): Promise<{ currentDays: number; longestDays: number }> {
		const [recordDates, planDates] = await Promise.all([
			this.prisma.exerciseRecord.findMany({
				where: {
					userId,
					deletedAt: null,
					status: { in: ['scored', 'submitted'] },
					completedAt: { not: null },
				},
				select: ExerciseRecordSelect.completedOnly,
			}),
			this.prisma.learningPlanItem.findMany({
				where: { userId, deletedAt: null, status: 'completed' },
				select: LearningPlanSelect.updatedAtOnly,
			}),
		]);

		const dateSet = new Set<string>();
		for (const a of recordDates) {
			if (a.completedAt) dateSet.add(a.completedAt.toISOString().split('T')[0]);
		}
		for (const p of planDates) {
			if (p.updatedAt) dateSet.add(p.updatedAt.toISOString().split('T')[0]);
		}

		if (dateSet.size === 0) return { currentDays: 0, longestDays: 0 };

		const sortedDates = Array.from(dateSet).sort();
		const today = new Date().toISOString().split('T')[0];
		const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

		let longestDays = 1;
		let currentStreak = 1;

		for (let i = 1; i < sortedDates.length; i++) {
			const prev = new Date(sortedDates[i - 1]);
			const curr = new Date(sortedDates[i]);
			const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);

			if (diffDays === 1) {
				currentStreak++;
				longestDays = Math.max(longestDays, currentStreak);
			} else {
				currentStreak = 1;
			}
		}

		const lastDate = sortedDates[sortedDates.length - 1];
		if (lastDate !== today && lastDate !== yesterday) {
			return { currentDays: 0, longestDays };
		}

		let currentDays = 1;
		for (let i = sortedDates.length - 2; i >= 0; i--) {
			const curr = new Date(sortedDates[i + 1]);
			const prev = new Date(sortedDates[i]);
			const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);

			if (diffDays === 1) {
				currentDays++;
			} else {
				break;
			}
		}

		return { currentDays, longestDays: Math.max(longestDays, currentDays) };
	}

	// PRIVATE: Vocabulary count
	private async getVocabularyCount(userId: string): Promise<number> {
		return this.prisma.userVocabulary.count({ where: { userId, deletedAt: null } });
	}

	// PRIVATE: Total exercise records
	private async getTotalAssessments(userId: string): Promise<number> {
		return this.prisma.exerciseRecord.count({
			where: { userId, deletedAt: null, status: { in: ['scored', 'submitted'] } },
		});
	}

	// PRIVATE: Total study minutes
	private async getTotalStudyMinutes(userId: string): Promise<number> {
		const records = await this.prisma.exerciseRecord.findMany({
			where: {
				userId,
				deletedAt: null,
				status: { in: ['scored', 'submitted'] },
				startedAt: { not: null },
				completedAt: { not: null },
			},
			select: ExerciseRecordSelect.timeRange,
		});

		let total = 0;
		for (const a of records) {
			if (!a.startedAt || !a.completedAt) continue;
			const minutes = Math.round((a.completedAt.getTime() - a.startedAt.getTime()) / 60000);
			total += Math.min(Math.max(0, minutes), 120);
		}
		return total;
	}

	// PRIVATE: Recent activity
	private async getRecentActivity(userId: string): Promise<RecentActivityItem[]> {
		const [recentRecords, recentPlanItems] = await Promise.all([
			this.prisma.exerciseRecord.findMany({
				where: { userId, deletedAt: null, status: { in: ['scored', 'submitted'] } },
				orderBy: { completedAt: 'desc' },
				take: 5,
				select: ExerciseRecordSelect.recentActivity,
			}),
			this.prisma.learningPlanItem.findMany({
				where: {
					userId,
					deletedAt: null,
					status: { in: ['completed', 'skipped'] },
					itemType: { not: 'weekly_review' },
				},
				orderBy: { updatedAt: 'desc' },
				take: 5,
				select: LearningPlanSelect.recentActivity,
			}),
		]);

		const activities: RecentActivityItem[] = [];

		for (const a of recentRecords) {
			const meta = await this.getRefMeta(a.refType, a.refId);
			activities.push({
				type: 'assessment',
				title: meta.title ?? `${a.refType} assessment`,
				skillName: meta.skillName,
				score: a.score !== null ? Number(a.score) : null,
				status: a.status,
				date: a.completedAt?.toISOString() ?? '',
			});
		}

		for (const p of recentPlanItems) {
			activities.push({
				type: 'plan_item',
				title: p.title,
				skillName: p.skillName,
				score: p.taskScore !== null ? Number(p.taskScore) : null,
				status: p.status,
				date: p.updatedAt?.toISOString() ?? '',
			});
		}

		return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
	}

	// PRIVATE: Activity calendar
	private async getActivityCalendar(userId: string, since: Date): Promise<ActivityDay[]> {
		const [records, planItems] = await Promise.all([
			this.prisma.exerciseRecord.findMany({
				where: {
					userId,
					deletedAt: null,
					status: { in: ['scored', 'submitted'] },
					completedAt: { gte: since },
				},
				select: ExerciseRecordSelect.timeRange,
			}),
			this.prisma.learningPlanItem.findMany({
				where: {
					userId,
					deletedAt: null,
					status: 'completed',
					updatedAt: { gte: since },
					itemType: { not: 'weekly_review' },
				},
				select: LearningPlanSelect.updatedAtOnly,
			}),
		]);

		const dayMap = new Map<string, ActivityDay>();

		for (const a of records) {
			if (!a.completedAt) continue;
			const dateKey = a.completedAt.toISOString().split('T')[0];
			const day = dayMap.get(dateKey) ?? {
				date: dateKey,
				assessmentCount: 0,
				planItemsCompleted: 0,
				totalStudyMinutes: 0,
			};
			day.assessmentCount++;

			if (a.startedAt && a.completedAt) {
				const minutes = Math.round((a.completedAt.getTime() - a.startedAt.getTime()) / 60000);
				day.totalStudyMinutes += Math.min(Math.max(0, minutes), 120);
			}

			dayMap.set(dateKey, day);
		}

		for (const p of planItems) {
			if (!p.updatedAt) continue;
			const dateKey = p.updatedAt.toISOString().split('T')[0];
			const day = dayMap.get(dateKey) ?? {
				date: dateKey,
				assessmentCount: 0,
				planItemsCompleted: 0,
				totalStudyMinutes: 0,
			};
			day.planItemsCompleted++;
			dayMap.set(dateKey, day);
		}

		return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
	}

	// PRIVATE: Calculate trend
	private calculateTrend(scores: number[]): 'up' | 'down' | 'stable' | 'new' {
		if (scores.length === 0) return 'new';
		if (scores.length === 1) return 'stable';

		const mid = Math.floor(scores.length / 2);
		const firstHalf = scores.slice(0, mid);
		const secondHalf = scores.slice(mid);

		const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
		const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;

		const diff = avgSecond - avgFirst;
		if (diff > 5) return 'up';
		if (diff < -5) return 'down';
		return 'stable';
	}

	// PRIVATE: Get ref metadata
	private async getRefMeta(
		refType: string,
		refId: string,
	): Promise<{ title: string | null; skillName: string | null }> {
		if (refType === 'lesson') {
			const lesson = await this.prisma.lesson.findFirst({
				where: { lessonId: refId },
				select: LessonSelect.titleSkill,
			});
			return { title: lesson?.title ?? null, skillName: lesson?.skillName ?? null };
		}
		if (refType === 'question_set') {
			const questionSet = await this.prisma.questionSet.findFirst({
				where: { questionSetId: refId },
				select: QuestionSetSelect.titleSkill,
			});
			return { title: questionSet?.title ?? null, skillName: questionSet?.skillName ?? null };
		}
		return { title: null, skillName: null };
	}
}
