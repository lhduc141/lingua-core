import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { BadRequestException, ResponseDto } from '@app/shared';
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

	// ================================================================
	// 1. GET /dashboard/overview
	// ================================================================
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

	// ================================================================
	// 2. GET /dashboard/skills/:skillName/progress
	// ================================================================
	async getSkillProgress(userId: string, skillName: string) {
		if (!VALID_SKILLS.includes(skillName)) {
			throw new BadRequestException(`Invalid skill: ${skillName}. Valid skills: ${VALID_SKILLS.join(', ')}`);
		}

		// Lấy tất cả assessments scored cho skill này
		const scoreHistory = await this.getScoreHistoryForSkill(userId, skillName);

		const assessmentCount = scoreHistory.length;
		const avgScore =
			assessmentCount > 0
				? Math.round((scoreHistory.reduce((s, h) => s + h.score, 0) / assessmentCount) * 10) / 10
				: null;

		const trend = this.calculateTrend(scoreHistory.map((h) => h.score));

		// Plan items cho skill này
		const [planItemsTotal, planItemsCompleted] = await Promise.all([
			this.prisma.learningPlanItem.count({
				where: {
					userId,
					skillName,
					deletedAt: null,
					itemType: { not: 'weekly_review' },
				},
			}),
			this.prisma.learningPlanItem.count({
				where: {
					userId,
					skillName,
					deletedAt: null,
					status: 'completed',
					itemType: { not: 'weekly_review' },
				},
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

	// ================================================================
	// 3. GET /dashboard/streak
	// ================================================================
	async getStreak(userId: string) {
		const streak = await this.calculateStreak(userId);

		// Activity calendar — last 30 days
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

	// ================================================================
	// 4. GET /dashboard/study-time
	// ================================================================
	async getStudyTime(userId: string, dto: GetStudyTimeDto) {
		const period = dto.period ?? 'week';

		const startDate = new Date();
		startDate.setHours(0, 0, 0, 0);

		if (period === 'week') {
			startDate.setDate(startDate.getDate() - 7);
		} else if (period === 'month') {
			startDate.setDate(startDate.getDate() - 30);
		} else {
			// 'all' — 365 ngày gần nhất (practical limit)
			startDate.setDate(startDate.getDate() - 365);
		}

		// Lấy assessments có cả startedAt và completedAt
		const assessments = await this.prisma.assessment.findMany({
			where: {
				userId,
				deletedAt: null,
				status: { in: ['scored', 'submitted'] },
				startedAt: { gte: startDate },
				completedAt: { not: null },
			},
			select: {
				startedAt: true,
				completedAt: true,
			},
			orderBy: { startedAt: 'asc' },
		});

		// Group by date
		const dayMap = new Map<string, { minutes: number; count: number }>();

		for (const a of assessments) {
			if (!a.startedAt || !a.completedAt) continue;
			const durationMs = a.completedAt.getTime() - a.startedAt.getTime();
			const minutes = Math.max(0, Math.round(durationMs / 60000));

			// Cap per-assessment duration at 120 minutes (loại bỏ outlier)
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

		const result: StudyTimeData = {
			period,
			totalMinutes,
			avgMinutesPerDay,
			dailyBreakdown,
		};

		return ResponseDto.success(Object, result);
	}

	// ================================================================
	// PRIVATE: CEFR data from latest completed CatSession
	// ================================================================
	private async getCefrData(userId: string): Promise<{ cefrLevel: string | null; confidence: number | null }> {
		const session = await this.prisma.catSession.findFirst({
			where: { userId, status: 'completed' },
			orderBy: { completedAt: 'desc' },
			select: { cefrLevel: true, confidence: true },
		});

		return {
			cefrLevel: session?.cefrLevel ?? null,
			confidence:
				session?.confidence !== null && session?.confidence !== undefined ? Number(session.confidence) : null,
		};
	}

	// ================================================================
	// PRIVATE: Current plan progress
	// ================================================================
	private async getPlanProgress(userId: string) {
		const latestItem = await this.prisma.learningPlanItem.findFirst({
			where: { userId, deletedAt: null, planCycle: { not: null } },
			orderBy: [{ planCycle: 'desc' }],
			select: { planCycle: true },
		});

		if (!latestItem?.planCycle) return null;

		const items = await this.prisma.learningPlanItem.findMany({
			where: { userId, planCycle: latestItem.planCycle, deletedAt: null },
			select: { status: true },
		});

		return {
			planCycle: latestItem.planCycle,
			total: items.length,
			completed: items.filter((i) => i.status === 'completed').length,
		};
	}

	// ================================================================
	// PRIVATE: Skill summary (avg score + trend per skill)
	// ================================================================
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

	// ================================================================
	// PRIVATE: Score history for a specific skill
	// ================================================================
	private async getScoreHistoryForSkill(userId: string, skillName: string): Promise<ScoreHistoryPoint[]> {
		// Lấy lessons + practice sessions thuộc skill này
		const [lessons, practiceSessions] = await Promise.all([
			this.prisma.lesson.findMany({
				where: { skillName: skillName as any, deletedAt: null },
				select: { lessonId: true, title: true },
			}),
			this.prisma.practiceSession.findMany({
				where: { skillName: skillName as any, deletedAt: null },
				select: { sessionId: true, title: true },
			}),
		]);

		const lessonIds = lessons.map((l) => l.lessonId);
		const sessionIds = practiceSessions.map((s) => s.sessionId);
		const allRefIds = [...lessonIds, ...sessionIds];

		if (allRefIds.length === 0) return [];

		// Lấy scored assessments
		const assessments = await this.prisma.assessment.findMany({
			where: {
				userId,
				refId: { in: allRefIds },
				status: 'scored',
				deletedAt: null,
				score: { not: null },
			},
			select: {
				refType: true,
				refId: true,
				score: true,
				completedAt: true,
			},
			orderBy: { completedAt: 'asc' },
		});

		// Build title lookup
		const titleMap = new Map<string, string>();
		for (const l of lessons) titleMap.set(l.lessonId, l.title);
		for (const s of practiceSessions) titleMap.set(s.sessionId, s.title);

		return assessments.map((a) => ({
			date: a.completedAt?.toISOString().split('T')[0] ?? '',
			score: Number(a.score),
			refType: a.refType,
			refTitle: titleMap.get(a.refId) ?? null,
		}));
	}

	// ================================================================
	// PRIVATE: Calculate current + longest streak
	// ================================================================
	private async calculateStreak(userId: string): Promise<{ currentDays: number; longestDays: number }> {
		// Lấy tất cả ngày có activity (assessment scored hoặc plan item completed)
		const [assessmentDates, planDates] = await Promise.all([
			this.prisma.assessment.findMany({
				where: {
					userId,
					deletedAt: null,
					status: { in: ['scored', 'submitted'] },
					completedAt: { not: null },
				},
				select: { completedAt: true },
			}),
			this.prisma.learningPlanItem.findMany({
				where: {
					userId,
					deletedAt: null,
					status: 'completed',
					// updatedAt: { not: null },
				},
				select: { updatedAt: true },
			}),
		]);

		// Collect unique dates
		const dateSet = new Set<string>();
		for (const a of assessmentDates) {
			if (a.completedAt) dateSet.add(a.completedAt.toISOString().split('T')[0]);
		}
		for (const p of planDates) {
			if (p.updatedAt) dateSet.add(p.updatedAt.toISOString().split('T')[0]);
		}

		if (dateSet.size === 0) return { currentDays: 0, longestDays: 0 };

		const sortedDates = Array.from(dateSet).sort();
		const today = new Date().toISOString().split('T')[0];
		const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

		// Calculate longest streak
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

		// Calculate current streak (must include today or yesterday)
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

	// ================================================================
	// PRIVATE: Vocabulary count
	// ================================================================
	private async getVocabularyCount(userId: string): Promise<number> {
		return this.prisma.userVocabulary.count({
			where: { userId, deletedAt: null },
		});
	}

	// ================================================================
	// PRIVATE: Total assessments (scored/submitted)
	// ================================================================
	private async getTotalAssessments(userId: string): Promise<number> {
		return this.prisma.assessment.count({
			where: {
				userId,
				deletedAt: null,
				status: { in: ['scored', 'submitted'] },
			},
		});
	}

	// ================================================================
	// PRIVATE: Total study minutes (from assessment duration)
	// ================================================================
	private async getTotalStudyMinutes(userId: string): Promise<number> {
		const assessments = await this.prisma.assessment.findMany({
			where: {
				userId,
				deletedAt: null,
				status: { in: ['scored', 'submitted'] },
				startedAt: { not: null },
				completedAt: { not: null },
			},
			select: { startedAt: true, completedAt: true },
		});

		let total = 0;
		for (const a of assessments) {
			if (!a.startedAt || !a.completedAt) continue;
			const minutes = Math.round((a.completedAt.getTime() - a.startedAt.getTime()) / 60000);
			total += Math.min(Math.max(0, minutes), 120); // cap 120 min
		}
		return total;
	}

	// ================================================================
	// PRIVATE: Recent activity (last 10 items)
	// ================================================================
	private async getRecentActivity(userId: string): Promise<RecentActivityItem[]> {
		const [recentAssessments, recentPlanItems] = await Promise.all([
			this.prisma.assessment.findMany({
				where: {
					userId,
					deletedAt: null,
					status: { in: ['scored', 'submitted'] },
				},
				orderBy: { completedAt: 'desc' },
				take: 5,
				select: {
					refType: true,
					refId: true,
					score: true,
					status: true,
					completedAt: true,
				},
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
				select: {
					title: true,
					skillName: true,
					taskScore: true,
					status: true,
					updatedAt: true,
				},
			}),
		]);

		const activities: RecentActivityItem[] = [];

		// Enrich assessments with title + skill
		for (const a of recentAssessments) {
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

		// Plan items
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

		// Sort by date desc, take 10
		return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
	}

	// ================================================================
	// PRIVATE: Activity calendar (for streak visualization)
	// ================================================================
	private async getActivityCalendar(userId: string, since: Date): Promise<ActivityDay[]> {
		const [assessments, planItems] = await Promise.all([
			this.prisma.assessment.findMany({
				where: {
					userId,
					deletedAt: null,
					status: { in: ['scored', 'submitted'] },
					completedAt: { gte: since },
				},
				select: { startedAt: true, completedAt: true },
			}),
			this.prisma.learningPlanItem.findMany({
				where: {
					userId,
					deletedAt: null,
					status: 'completed',
					updatedAt: { gte: since },
					itemType: { not: 'weekly_review' },
				},
				select: { updatedAt: true },
			}),
		]);

		const dayMap = new Map<string, ActivityDay>();

		for (const a of assessments) {
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

	// ================================================================
	// PRIVATE: Calculate trend from score history
	// ================================================================
	private calculateTrend(scores: number[]): 'up' | 'down' | 'stable' | 'new' {
		if (scores.length === 0) return 'new';
		if (scores.length === 1) return 'stable';

		// So sánh nửa cuối vs nửa đầu
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

	// ================================================================
	// PRIVATE: Get ref metadata (title + skillName)
	// ================================================================
	private async getRefMeta(
		refType: string,
		refId: string,
	): Promise<{ title: string | null; skillName: string | null }> {
		if (refType === 'lesson') {
			const lesson = await this.prisma.lesson.findFirst({
				where: { lessonId: refId },
				select: { title: true, skillName: true },
			});
			return { title: lesson?.title ?? null, skillName: lesson?.skillName ?? null };
		}
		if (refType === 'practice_session') {
			const session = await this.prisma.practiceSession.findFirst({
				where: { sessionId: refId },
				select: { title: true, skillName: true },
			});
			return { title: session?.title ?? null, skillName: session?.skillName ?? null };
		}
		return { title: null, skillName: null };
	}
}
