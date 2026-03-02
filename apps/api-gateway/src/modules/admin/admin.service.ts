import { PrismaService } from '../../../../../prisma/prisma.service';
import { CreatePassageDto } from './dto/create-passage.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreatePracticeSessionDto } from './dto/create-practice-session.dto';
import { BulkImportDictionaryDto } from './dto/bulk-import-dictionary.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, NotFoundException } from '@app/shared';
import { PassageSelect, UserSelect } from '../../../../../prisma/selects';

@Injectable()
export class AdminService {
	private readonly logger = new Logger(AdminService.name);

	constructor(private prisma: PrismaService) {}

	// ==========================================
	// PASSAGE MANAGEMENT
	// ==========================================

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
					audioUrl: dto.audioUrl,
					imageUrl: dto.imageUrl,
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

	// ==========================================
	// QUESTION MANAGEMENT
	// ==========================================

	async createQuestion(dto: CreateQuestionDto) {
		try {
			const isMcqType = ['mcq_single', 'mcq_multi', 'fill_blank', 'cloze_bank'].includes(dto.type);

			if (isMcqType && (!dto.options || dto.options.length === 0))
				throw new BadRequestException(`Question type ${dto.type} requires at least one option`);

			if (isMcqType && dto.type === 'mcq_single') {
				const correctCount = dto.options?.filter((opt) => opt.isCorrect).length || 0;
				if (correctCount !== 1) throw new BadRequestException('MCQ Single must have exactly 1 correct answer');
			}

			if (isMcqType && dto.type === 'mcq_multi') {
				const correctCount = dto.options?.filter((opt) => opt.isCorrect).length || 0;
				if (correctCount < 1) throw new BadRequestException('MCQ Multi must have at least 1 correct answer');
			}

			if (dto.passageId) {
				const passage = await this.prisma.passage.findUnique({
					where: { passageId: dto.passageId },
				});
				if (!passage) {
					throw new NotFoundException(`Passage ${dto.passageId} not found`);
				}
			}

			const question = await this.prisma.question.create({
				data: {
					passageId: dto.passageId,
					type: dto.type,
					difficulty: dto.difficulty ?? 1,
					examKind: dto.examKind ?? 'generic',
					status: dto.status ?? 'draft',
					timeLimitSec: dto.timeLimitSec,
					maxScore: dto.maxScore ?? 1,
					sourceTag: dto.sourceTag,

					translations: {
						create: {
							locale: 'en',
							stemText: dto.stemText,
						},
					},

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
					options: {
						include: {
							translations: true,
						},
					},
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

	// LESSON MANAGEMENT
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
						? {
								create: dto.questionIds.map((qId, index) => ({
									questionId: qId,
									position: index + 1,
								})),
							}
						: undefined,
				},
				include: {
					lessonQuestions: {
						include: { question: true },
					},
				},
			});

			return {
				lessonId: lesson.lessonId,
				skillName: lesson.skillName,
				title: lesson.title,
				questionCount: lesson.lessonQuestions.length,
			};
		} catch (error) {
			throw error;
		}
	}

	// PRACTICE SESSION MANAGEMENT

	async createPracticeSession(dto: CreatePracticeSessionDto) {
		try {
			const questions = await this.prisma.question.findMany({
				where: { questionId: { in: dto.questionIds } },
			});
			if (questions.length !== dto.questionIds.length) throw new BadRequestException('Some questions not found');

			const session = await this.prisma.practiceSession.create({
				data: {
					skillName: dto.skillName,
					title: dto.title,
					description: dto.description,
					cefrLevel: dto.cefrLevel,
					estimatedMinutes: dto.estimatedMinutes,
					isActive: dto.isActive ?? true,

					questions: {
						create: dto.questionIds.map((qId, index) => ({
							questionId: qId,
							position: index + 1,
						})),
					},
				},
				include: {
					questions: {
						include: { question: true },
					},
				},
			});

			return {
				sessionId: session.sessionId,
				skillName: session.skillName,
				title: session.title,
				questionCount: session.questions.length,
			};
		} catch (error) {
			throw error;
		}
	}

	// DICTIONARY IMPORT
	async bulkImportDictionary(dto: BulkImportDictionaryDto) {
		try {
			const decoded = Buffer.from(dto.data, 'base64').toString('utf-8');

			let entries: any[] = [];

			if (dto.format === 'json') entries = JSON.parse(decoded);
			else if (dto.format === 'csv') {
				const lines = decoded.split('\n');
				const headers = lines[0].split(',');

				entries = lines.slice(1).map((line) => {
					const values = line.split(',');
					const entry: any = {};
					headers.forEach((header, index) => {
						entry[header.trim()] = values[index]?.trim();
					});
					return entry;
				});
			}

			const results = {
				imported: 0,
				failed: 0,
				errors: [] as any[],
			};

			for (let i = 0; i < entries.length; i++) {
				const entry = entries[i];

				try {
					await this.prisma.$transaction(async (tx) => {
						const dictEntry = await tx.dictEntry.create({
							data: {
								lang: 'en',
								headword: entry.headword,
								pos: entry.pos,
								ipa: entry.ipa,
								cefrLevel: entry.cefrLevel,
								frequency: entry.frequency ? parseInt(entry.frequency) : null,
								isCommon: entry.isCommon === 'true' || entry.isCommon === true,
								// variants: entry.variants || null,
							},
						});

						if (entry.senses && Array.isArray(entry.senses)) {
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
						}
					});

					results.imported++;
				} catch (error) {
					results.failed++;
					results.errors.push({
						row: i + 1,
						headword: entry.headword,
						error: error.message,
					});
				}
			}

			return results;
		} catch (error) {
			throw new BadRequestException('Failed to import dictionary');
		}
	}

	// ==========================================
	// USER MANAGEMENT
	// ==========================================

	async listUsers(query: ListUsersDto) {
		try {
			const { search, isActive, isAdmin, limit = 50, offset = 0 } = query;

			const where: any = {
				deletedAt: null,
			};

			if (search) {
				where.OR = [
					{ email: { contains: search, mode: 'insensitive' } },
					{ googleName: { contains: search, mode: 'insensitive' } },
				];
			}

			if (isActive !== undefined) {
				where.isActive = isActive;
			}

			if (isAdmin !== undefined) {
				where.isAdmin = isAdmin;
			}

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

			return {
				users,
				total,
				limit,
				offset,
			};
		} catch (error) {
			this.logger.error(`Failed to list users: ${error.message}`, error.stack);
			throw error;
		}
	}

	// ==========================================
	// SYSTEM STATISTICS
	// ==========================================

	async getSystemStats() {
		try {
			const startOfWeek = this.getStartOfWeek();

			const [
				totalUsers,
				activeUsers,
				newUsersThisWeek,
				totalLessons,
				totalPracticeSessions,
				totalQuestions,
				totalPassages,
				totalDictEntries,
				assessmentsThisWeek,
				srsReviewsThisWeek,
			] = await Promise.all([
				this.prisma.user.count({ where: { deletedAt: null } }),
				this.prisma.user.count({ where: { isActive: true, deletedAt: null } }),
				this.prisma.user.count({
					where: {
						createdAt: { gte: startOfWeek },
						deletedAt: null,
					},
				}),

				this.prisma.lesson.count({ where: { deletedAt: null } }),
				this.prisma.practiceSession.count({ where: { deletedAt: null } }),
				this.prisma.question.count({ where: { deletedAt: null } }),
				this.prisma.passage.count({ where: { deletedAt: null } }),
				this.prisma.dictEntry.count({ where: { deletedAt: null } }),

				this.prisma.assessment.count({
					where: {
						createdAt: { gte: startOfWeek },
					},
				}),
				this.prisma.srsReview.count({
					where: {
						createdAt: { gte: startOfWeek },
					},
				}),
			]);

			return {
				users: {
					total: totalUsers,
					active: activeUsers,
					newThisWeek: newUsersThisWeek,
				},
				content: {
					lessons: totalLessons,
					practiceSessions: totalPracticeSessions,
					questions: totalQuestions,
					passages: totalPassages,
					dictionaryEntries: totalDictEntries,
				},
				activity: {
					assessmentsThisWeek,
					srsReviewsThisWeek,
				},
			};
		} catch (error) {
			this.logger.error(`Failed to get system stats: ${error.message}`, error.stack);
			throw error;
		}
	}

	// ==========================================
	// PRIVATE HELPER METHODS
	// ==========================================

	private calculateWordCount(content: string): number {
		const words = content.trim().split(/\s+/);
		return words.filter((word) => word.length > 0).length;
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
