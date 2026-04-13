import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, NotFoundException, PagingDataDto, ResponseDto } from '@app/shared';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { LessonSelect, PassageSelect, PlacementSessionSelect, UserSelect } from '../../../../../prisma/selects';
import {
	BulkImportDictionaryDto,
	CreateLessonDto,
	CreatePassageDto,
	CreateQuestionDto,
	CreateQuestionSetDto,
	ListAdminLessonsDto,
	ListPlacementSessionsDto,
	ListUsersDto,
	QuestionType,
	UpdateLessonStatusDto,
} from './dto';
import { SkillPerfRow } from './interface';

@Injectable()
export class AdminService {
	private readonly logger = new Logger(AdminService.name);

	constructor(private prisma: PrismaService) {}

	// PASSAGE MANAGEMENT
	async createPassage(dto: CreatePassageDto) {
		try {
			const wordCount = dto.wordCount ?? this.calculateWordCount(dto.content);
			const passage = await this.prisma.passage.create({
				data: {
					title: dto.title,
					content: dto.content,
					wordCount,
					cefrLevel: dto.cefrLevel,
					topic: dto.topic,
					sourceTag: dto.sourceTag,
				},
				select: PassageSelect.create,
			});
			this.logger.log(`Passage created: ${passage.passageId}`);
			return passage;
		} catch (error) {
			this.logger.error(`Failed to create passage: ${error.message}`, error.stack);
			throw new BadRequestException('Failed to create passage');
		}
	}

	// QUESTION MANAGEMENT
	async createQuestion(dto: CreateQuestionDto) {
		try {
			const isMcqType = ['mcq_single', 'mcq_multi', 'fill_blank', 'cloze_bank'].includes(dto.type);

			if (isMcqType && (!dto.options || dto.options.length === 0))
				throw new BadRequestException(`Question type ${dto.type} requires at least one option`);

			if (isMcqType && dto.type === QuestionType.MCQ_SINGLE) {
				const correctCount = dto.options?.filter((opt) => opt.isCorrect).length || 0;
				if (correctCount !== 1) throw new BadRequestException('MCQ Single must have exactly 1 correct answer');
			}

			if (isMcqType && dto.type === QuestionType.MCQ_MULTI) {
				const correctCount = dto.options?.filter((opt) => opt.isCorrect).length || 0;
				if (correctCount < 1) throw new BadRequestException('MCQ Multi must have at least 1 correct answer');
			}

			if (dto.passageId) {
				const passage = await this.prisma.passage.findUnique({ where: { passageId: dto.passageId } });
				if (!passage) throw new NotFoundException(`Passage ${dto.passageId} not found`);
			}

			const question = await this.prisma.question.create({
				data: {
					passageId: dto.passageId,
					type: dto.type,
					difficulty: dto.difficulty ?? 1,
					status: dto.status ?? 'draft',
					timeLimitSec: dto.timeLimitSec,
					maxScore: dto.maxScore ?? 1,
					sourceTag: dto.sourceTag,
					translations: { create: { locale: 'en', stemText: dto.stemText } },
					options: dto.options
						? {
								create: dto.options.map((opt, index) => ({
									weight: 0,
									isCorrect: opt.isCorrect ?? false,
									position: opt.position ?? index + 1,
									translations: {
										create: {
											locale: 'en',
											optionText: opt.optionText,
											explanation: opt.explanation,
										},
									},
								})),
							}
						: undefined,
				},
				include: {
					translations: true,
					options: { include: { translations: true } },
				},
			});

			this.logger.log(`Question created: ${question.questionId} (type: ${question.type})`);
			return {
				questionId: question.questionId,
				type: question.type,
				stemText: question.translations[0]?.stemText || '',
			};
		} catch (error) {
			this.logger.error(`Failed to create question: ${error.message}`, error.stack);
			throw error;
		}
	}

	// ==========================================
	// LESSON MANAGEMENT
	// ==========================================

	async createLesson(dto: CreateLessonDto) {
		try {
			if (dto.questionIds && dto.questionIds.length > 0) {
				const questions = await this.prisma.question.findMany({
					where: { questionId: { in: dto.questionIds } },
				});
				if (questions.length !== dto.questionIds.length)
					throw new BadRequestException('Some questions not found');
			}
			if (dto.prerequisites && dto.prerequisites.length > 0) {
				const prereqLessons = await this.prisma.lesson.findMany({
					where: { lessonId: { in: dto.prerequisites } },
				});
				if (prereqLessons.length !== dto.prerequisites.length)
					throw new BadRequestException('Some prerequisite lessons not found');
			}

			const lesson = await this.prisma.lesson.create({
				data: {
					skillName: dto.skillName,
					title: dto.title,
					description: dto.description,
					theoryContent: dto.theoryContent ? ({ sections: dto.theoryContent } as any) : null,
					prerequisites: (dto.prerequisites || null) as any,
					cefrLevel: dto.cefrLevel,
					estimatedMinutes: dto.estimatedMinutes,
					status: (dto.status ?? 'draft') as any,
					lessonQuestions: dto.questionIds
						? { create: dto.questionIds.map((qId, index) => ({ questionId: qId, position: index + 1 })) }
						: undefined,
				},
				include: { lessonQuestions: { include: { question: true } } },
			});

			return {
				lessonId: lesson.lessonId,
				skillName: lesson.skillName,
				title: lesson.title,
				status: lesson.status,
			};
		} catch (error) {
			this.logger.error(`Failed to create lesson: ${error.message}`, error.stack);
			throw error;
		}
	}

	// ==========================================
	// QUESTION SET MANAGEMENT
	// ==========================================

	async createQuestionSet(dto: CreateQuestionSetDto) {
		try {
			const questionSet = await this.prisma.questionSet.create({
				data: {
					title: dto.title,
					description: dto.description,
					skillName: dto.skillName as any,
					cefrLevel: dto.cefrLevel,
					estimatedMinutes: dto.estimatedMinutes,
					items: dto.questionIds
						? { create: dto.questionIds.map((qId, index) => ({ questionId: qId, position: index + 1 })) }
						: undefined,
				},
			});
			return { questionSetId: questionSet.questionSetId, title: questionSet.title };
		} catch (error) {
			this.logger.error(`Failed to create question set: ${error.message}`, error.stack);
			throw new BadRequestException('Failed to create question set');
		}
	}

	// DICTIONARY IMPORT
	async bulkImportDictionary(dto: BulkImportDictionaryDto) {
		try {
			const raw = Buffer.from(dto.data, 'base64').toString('utf-8');
			const entries = JSON.parse(raw);

			const results = { imported: 0, skipped: 0, failed: 0, errors: [] as any[] };

			for (let i = 0; i < entries.length; i++) {
				const entry = entries[i];
				try {
					const existing = await this.prisma.dictEntry.findFirst({ where: { headword: entry.headword } });
					if (existing) {
						results.skipped++;
						continue;
					}

					await this.prisma.$transaction(async (tx) => {
						const dictEntry = await tx.dictEntry.create({
							data: {
								lang: 'en',
								headword: entry.headword,
								pos: entry.pos,
								ipa: entry.ipa,
								cefrLevel: entry.cefrLevel,
								source: 'manual',
							},
						});

						if (entry.wordForms) {
							for (const wf of entry.wordForms) {
								await tx.wordForm.upsert({
									where: { form: wf.form },
									update: {},
									create: { entryId: dictEntry.entryId, form: wf.form, pos: wf.pos },
								});
							}
						}

						for (const sense of entry.senses) {
							const dictSense = await tx.dictSense.create({
								data: {
									entryId: dictEntry.entryId,
									order: sense.order,
									shortDef: sense.shortDef,
									viDef: sense.viDef,
									synonyms: sense.synonyms || null,
									antonyms: sense.antonyms || null,
								},
							});

							if (sense.examples) {
								for (const ex of sense.examples) {
									await tx.dictExample.create({
										data: {
											senseId: dictSense.senseId,
											example: ex.example,
											translation: ex.translation,
										},
									});
								}
							}

							if (sense.collocations) {
								for (const coll of sense.collocations) {
									await tx.collocation.create({
										data: {
											entryId: dictEntry.entryId,
											senseId: dictSense.senseId,
											phrase: coll.phrase,
											meaning: coll.meaning,
											viMeaning: coll.viMeaning,
											example: coll.example,
											viExample: coll.viExample,
											frequency: coll.frequency,
											cefrLevel: coll.cefrLevel,
										},
									});
								}
							}
						}
					});
					results.imported++;
				} catch (error) {
					results.failed++;
					results.errors.push({ row: i + 1, headword: entry.headword, error: error.message });
				}
			}

			return results;
		} catch (error) {
			throw new BadRequestException('Failed to import dictionary');
		}
	}

	// USER MANAGEMENT
	async listUsers(query: ListUsersDto) {
		try {
			const { search, isActive, isAdmin, limit = 50, offset = 0 } = query;

			const where: any = { deletedAt: null };

			if (search) {
				where.OR = [
					{ email: { contains: search, mode: 'insensitive' } },
					{ googleName: { contains: search, mode: 'insensitive' } },
				];
			}
			if (isActive !== undefined) where.isActive = isActive;
			if (isAdmin !== undefined) where.isAdmin = isAdmin;

			const [users, total] = await Promise.all([
				this.prisma.user.findMany({
					where,
					select: UserSelect.list,
					orderBy: { createdAt: 'desc' },
					take: limit,
					skip: offset,
				}),
				this.prisma.user.count({ where }),
			]);
			const rows = users.map((u) => ({
				...u,
				cefrLevel: u.placementSessions[0]?.cefrLevel ?? null,
				placementSessions: undefined,
			}));

			return { users: rows, total, limit, offset };
		} catch (error) {
			this.logger.error(`Failed to list users: ${error.message}`, error.stack);
			throw error;
		}
	}

	// SYSTEM STATISTICS (EXTENDED)
	async getSystemStats() {
		try {
			const startOfWeek = this.getStartOfWeek();

			const [
				totalUsers,
				activeUsers,
				newUsersThisWeek,
				totalLessons,
				totalQuestionSet,
				totalQuestions,
				totalPassages,
				totalDictEntries,
				exerciseRecordsThisWeek,
				pendingGrading,
				surveyDone,
				placementDone,
				cefrGroups,
			] = await Promise.all([
				this.prisma.user.count({ where: { deletedAt: null } }),
				this.prisma.user.count({ where: { isActive: true, deletedAt: null } }),
				this.prisma.user.count({ where: { createdAt: { gte: startOfWeek }, deletedAt: null } }),
				this.prisma.lesson.count({ where: { deletedAt: null } }),
				this.prisma.questionSet.count({ where: { deletedAt: null } }),
				this.prisma.question.count({ where: { deletedAt: null } }),
				this.prisma.passage.count({ where: { deletedAt: null } }),
				this.prisma.dictEntry.count({ where: { deletedAt: null } }),
				this.prisma.exerciseRecord.count({ where: { createdAt: { gte: startOfWeek } } }),
				this.prisma.exerciseRecord.count({ where: { status: 'submitted' as any } }),
				this.prisma.onboardingSurvey.count({ where: { isActive: true, deletedAt: null } }),
				this.prisma.placementSession.count({ where: { status: 'completed' } }),
				this.prisma.placementSession.groupBy({
					by: ['cefrLevel'],
					where: { status: 'completed', cefrLevel: { not: null } },
					_count: { cefrLevel: true },
				}),
			]);

			const skillPerfRows = await this.prisma.$queryRaw<SkillPerfRow[]>`
                SELECT l.skill_name as "skillName",
                       ROUND(AVG(er.score)::numeric, 1)::float as "avgScore",
                       COUNT(*)::int as "count"
                FROM exercise_records er
                JOIN lessons l ON l.lesson_id = er.ref_id
                WHERE er.status = 'scored'
                  AND er.ref_type = 'lesson'
                  AND er.score IS NOT NULL
                  AND er.deleted_at IS NULL
                GROUP BY l.skill_name
            `;

			const cefrDistribution = Object.fromEntries(cefrGroups.map((g) => [g.cefrLevel, g._count.cefrLevel]));

			const skillPerformance = Object.fromEntries(
				skillPerfRows.map((r) => [r.skillName, { avgScore: r.avgScore, count: r.count }]),
			);

			return {
				users: { total: totalUsers, active: activeUsers, newThisWeek: newUsersThisWeek },
				content: {
					lessons: totalLessons,
					questionSets: totalQuestionSet,
					questions: totalQuestions,
					passages: totalPassages,
					dictionaryEntries: totalDictEntries,
				},
				activity: { exerciseRecordsThisWeek, pendingGrading },
				funnel: { totalUsers, surveyDone, placementDone },
				cefrDistribution,
				skillPerformance,
			};
		} catch (error) {
			this.logger.error(`Failed to get system stats: ${error.message}`, error.stack);
			throw error;
		}
	}

	// ADMIN LESSON MANAGEMENT
	async listAdminLessons(dto: ListAdminLessonsDto) {
		try {
			const { pageIndex, pageSize, skill, cefrLevel, status } = dto;
			const skip = (pageIndex - 1) * pageSize;

			const where: any = { deletedAt: null };
			if (skill) where.skillName = skill;
			if (cefrLevel) where.cefrLevel = cefrLevel;
			if (status) where.status = status;

			const [rows, count] = await Promise.all([
				this.prisma.lesson.findMany({
					where,
					select: LessonSelect.adminList,
					orderBy: [{ cefrLevel: 'asc' }, { skillName: 'asc' }, { title: 'asc' }],
					skip,
					take: pageSize,
				}),
				this.prisma.lesson.count({ where }),
			]);

			const lessons = rows.map((l) => ({
				...l,
				questionCount: l._count.lessonQuestions,
				_count: undefined,
			}));

			return ResponseDto.success(Object, new PagingDataDto({ count, rows: lessons }));
		} catch (error) {
			this.logger.error(`Failed to list admin lessons: ${error.message}`, error.stack);
			throw error;
		}
	}

	async updateLessonStatus(lessonId: string, dto: UpdateLessonStatusDto) {
		try {
			const lesson = await this.prisma.lesson.findFirst({ where: { lessonId, deletedAt: null } });
			if (!lesson) throw new NotFoundException(`Lesson ${lessonId} not found`);

			const updated = await this.prisma.lesson.update({
				where: { lessonId },
				data: { status: dto.status as any },
				select: { lessonId: true, title: true, status: true },
			});

			this.logger.log(`Lesson ${lessonId} status updated to ${dto.status}`);
			return updated;
		} catch (error) {
			this.logger.error(`Failed to update lesson status: ${error.message}`, error.stack);
			throw error;
		}
	}

	// PLACEMENT SESSIONS
	async listPlacementSessions(dto: ListPlacementSessionsDto) {
		try {
			const { pageIndex, pageSize, cefrLevel, status } = dto;
			const skip = (pageIndex - 1) * pageSize;

			const where: any = {};
			if (cefrLevel) where.cefrLevel = cefrLevel;
			if (status) where.status = status;

			const [rows, count] = await Promise.all([
				this.prisma.placementSession.findMany({
					where,
					select: PlacementSessionSelect.adminList,
					orderBy: { startedAt: 'desc' },
					skip,
					take: pageSize,
				}),
				this.prisma.placementSession.count({ where }),
			]);

			// Flatten Decimal → number
			const sessions = rows.map((s) => ({
				...s,
				confidence: s.confidence !== null ? Number(s.confidence) : null,
				finalTheta: s.finalTheta !== null ? Number(s.finalTheta) : null,
			}));

			return ResponseDto.success(Object, new PagingDataDto({ count, rows: sessions }));
		} catch (error) {
			this.logger.error(`Failed to list placement sessions: ${error.message}`, error.stack);
			throw error;
		}
	}

	// PRIVATE HELPERS
	private calculateWordCount(content: string): number {
		return content
			.trim()
			.split(/\s+/)
			.filter((w) => w.length > 0).length;
	}

	private getStartOfWeek(): Date {
		const now = new Date();
		const dayOfWeek = now.getDay();
		const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
		const monday = new Date(now.setDate(diff));
		monday.setHours(0, 0, 0, 0);
		return monday;
	}
}
