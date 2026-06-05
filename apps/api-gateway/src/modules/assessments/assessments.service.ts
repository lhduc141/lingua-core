import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { BadRequestException, NotFoundException, PagingDataDto, PronunciationScores, ResponseDto } from '@app/shared';
import { BullmqService } from '@app/bullmq';
import { AiClientService } from '@app/ai-client';
import {
	AnswerSelect,
	ExerciseRecordSelect,
	LessonQuestionSelect,
	LessonSelect,
	QuestionSelect,
	QuestionSetItemSelect,
	QuestionSetSelect,
} from '../../../../../prisma/selects';
import { StartLessonAssessmentDto } from './dto/start-lesson-assessment.dto';
import { StartQuestionSetAssessmentDto } from './dto/start-question-set-assessment.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { ListAssessmentHistoryDto } from './dto/list-assessment-history.dto';
import { Job } from 'bullmq';
import { GradeSubjectiveJobData } from './interface/grade-subjective.interface';
import { AssessmentJob, AssessmentQueues } from '@app/shared/queues';
import { AssessmentQuestion } from './interface/assessment-question.interface';
import { AssessmentStartResponse } from './interface/assessment-start-response.interface';
import { AssessmentResultResponse } from './interface/assessment-result-response.interface';
import { AssessmentHistoryItem } from './interface/assessment-history-item.interface';
import { AnswerResult } from './interface/answer-result.interface';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const SUBJECTIVE_TYPES = ['essay', 'speaking', 'short_answer'];
const OBJECTIVE_TYPES = ['mcq_single', 'mcq_multi', 'fill_blank', 'matching', 'ordering', 'cloze_bank'];

@Injectable()
export class AssessmentsService implements OnModuleInit {
	private readonly logger = new Logger(AssessmentsService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly bullmq: BullmqService,
		private readonly aiClient: AiClientService,
	) {}

	onModuleInit() {
		this.bullmq.registerWorker<GradeSubjectiveJobData>(
			AssessmentQueues.ASSESSMENT_AI,
			(job: Job<GradeSubjectiveJobData>) => this.handleGradeJob(job),
		);
	}

	// 1. START LESSON ASSESSMENT
	async startLessonAssessment(userId: string, dto: StartLessonAssessmentDto) {
		const { lessonId } = dto;

		const lesson = await this.prisma.lesson.findFirst({
			where: { lessonId, deletedAt: null, status: 'published' },
			select: LessonSelect.detail,
		});

		if (!lesson) throw new NotFoundException('Lesson not found or not published');

		if (lesson.lessonQuestions.length === 0) {
			throw new BadRequestException('Lesson has no questions');
		}

		const exerciseRecord = await this.prisma.exerciseRecord.create({
			data: {
				userId,
				refType: 'lesson' as any,
				refId: lessonId,
				status: 'in_progress' as any,
				startedAt: new Date(),
			},
			select: ExerciseRecordSelect.idOnly,
		});

		this.logger.log(
			`Lesson assessment started | userId=${userId} | lessonId=${lessonId} | assessmentId=${exerciseRecord.exerciseRecordId}`,
		);

		await this.markPlanItemInProgress(userId, 'lesson', lessonId);

		const questions: AssessmentQuestion[] = lesson.lessonQuestions.map((lq) => ({
			questionId: lq.question.questionId,
			type: lq.question.type,
			position: lq.position,
			maxScore: lq.question.maxScore,
			stemText: lq.question.translations[0]?.stemText ?? null,
			contentJson: lq.question.translations[0]?.contentJson ?? (lq.question as any).payload?.configJson ?? null,
			passage: lq.question.passage
				? {
						passageId: lq.question.passage.passageId,
						title: lq.question.passage.title,
						content: lq.question.passage.content,
						cefrLevel: lq.question.passage.cefrLevel,
						wordCount: lq.question.passage.wordCount,
						audioUrl: lq.question.passage.audioUrl ?? null,
					}
				: null,
			options: lq.question.options.map((o) => ({
				optionId: o.optionId,
				position: o.position,
				text: o.translations[0]?.optionText ?? null,
			})),
		}));

		const response: AssessmentStartResponse = {
			exerciseRecordId: exerciseRecord.exerciseRecordId,
			refType: 'lesson',
			totalQuestions: questions.length,
			lesson: {
				lessonId: lesson.lessonId,
				title: lesson.title,
				skillName: lesson.skillName,
				cefrLevel: lesson.cefrLevel,
				estimatedMinutes: lesson.estimatedMinutes,
				theoryContent: lesson.theoryContent,
			},
			questions,
		};

		return ResponseDto.success(Object, response, 'Lesson assessment started');
	}

	// 2. START PRACTICE ASSESSMENT
	async startQuestionSetAssessment(userId: string, dto: StartQuestionSetAssessmentDto) {
		const { questionSetId } = dto;

		const questionSet = await this.prisma.questionSet.findFirst({
			where: { questionSetId, deletedAt: null, isActive: true },
			select: QuestionSetSelect.detail,
		});

		if (!questionSet) throw new NotFoundException('Question set not found or inactive');
		if (questionSet.items.length === 0) {
			throw new BadRequestException('Practice session has no questions');
		}

		const exerciseRecord = await this.prisma.exerciseRecord.create({
			data: {
				userId,
				refType: 'question_set' as any,
				refId: questionSetId,
				status: 'in_progress' as any,
				startedAt: new Date(),
			},
			select: ExerciseRecordSelect.idOnly,
		});

		this.logger.log(
			`Practice assessment started | userId=${userId} | questionSetId=${questionSetId} | exerciseRecordId=${exerciseRecord.exerciseRecordId}`,
		);

		await this.markPlanItemInProgress(userId, 'question_set', questionSetId);

		const questions: AssessmentQuestion[] = questionSet.items.map((sq) => ({
			questionId: sq.question.questionId,
			type: sq.question.type,
			position: sq.position,
			maxScore: sq.question.maxScore,
			stemText: sq.question.translations[0]?.stemText ?? null,
			contentJson: sq.question.translations[0]?.contentJson ?? (sq.question as any).payload?.configJson ?? null,
			passage: sq.question.passage
				? {
						passageId: sq.question.passage.passageId,
						title: sq.question.passage.title,
						content: sq.question.passage.content,
						cefrLevel: sq.question.passage.cefrLevel,
						wordCount: sq.question.passage.wordCount,
						audioUrl: sq.question.passage.audioUrl ?? null,
					}
				: null,
			options: sq.question.options.map((o) => ({
				optionId: o.optionId,
				position: o.position,
				text: o.translations[0]?.optionText ?? null,
			})),
		}));

		const response: AssessmentStartResponse = {
			exerciseRecordId: exerciseRecord.exerciseRecordId,
			refType: 'question_set',
			totalQuestions: questions.length,
			questionSet: {
				questionSetId: questionSet.questionSetId,
				title: questionSet.title,
				skillName: questionSet.skillName,
				cefrLevel: questionSet.cefrLevel,
				estimatedMinutes: questionSet.estimatedMinutes,
			},
			questions,
		};

		return ResponseDto.success(Object, response, 'Question set assessment started');
	}

	// 3. SUBMIT ANSWER (non-speaking)
	async submitAnswer(userId: string, exerciseRecordId: string, dto: SubmitAnswerDto) {
		const { questionId, answer } = dto;

		const exerciseRecord = await this.prisma.exerciseRecord.findFirst({
			where: { exerciseRecordId, userId, deletedAt: null },
			select: ExerciseRecordSelect.statusRef,
		});
		if (!exerciseRecord) throw new NotFoundException('Assessment not found');
		if (exerciseRecord.status !== 'in_progress') {
			throw new BadRequestException(`Assessment is not in progress (status: ${exerciseRecord.status})`);
		}

		const questionBelongs = await this.verifyQuestionBelongs(
			exerciseRecord.refType,
			exerciseRecord.refId,
			questionId,
		);
		if (!questionBelongs) throw new BadRequestException('Question does not belong to this assessment');

		const existing = await this.prisma.answer.findFirst({
			where: { exerciseRecordId, questionId, deletedAt: null },
			select: AnswerSelect.idOnly,
		});
		if (existing) {
			await this.prisma.answerDetail.deleteMany({ where: { answerId: existing.answerId } });
			await this.createAttemptAnswers(existing.answerId, answer);
			return ResponseDto.success(
				Object,
				{ answerId: existing.answerId, questionId, gradingStatus: 'pending', saved: true },
				'Answer updated',
			);
		}

		const newAnswer = await this.prisma.answer.create({
			data: {
				userId,
				exerciseRecordId,
				questionId,
				gradingStatus: 'pending' as any,
				submittedAt: new Date(),
			},
			select: AnswerSelect.idOnly,
		});
		await this.createAttemptAnswers(newAnswer.answerId, answer);
		this.logger.log(
			`Answer submitted | exerciseRecordId=${exerciseRecordId} | questionId=${questionId} | answerId=${newAnswer.answerId}`,
		);

		return ResponseDto.success(
			Object,
			{ answerId: newAnswer.answerId, questionId, gradingStatus: 'pending', saved: true },
			'Answer saved',
		);
	}

	// 3b. SUBMIT SPEAKING ANSWER — fire-and-forget
	// Nhận audio file → lưu tmp → tạo Answer record → đẩy BullMQ job → return ngay
	async submitSpeakingAnswer(
		userId: string,
		exerciseRecordId: string,
		questionId: string,
		file: Express.Multer.File,
	) {
		if (!file) throw new BadRequestException('No audio file provided');
		if (!questionId) throw new BadRequestException('questionId is required');

		const exerciseRecord = await this.prisma.exerciseRecord.findFirst({
			where: { exerciseRecordId, userId, deletedAt: null },
			select: ExerciseRecordSelect.statusRef,
		});
		if (!exerciseRecord) throw new NotFoundException('Assessment not found');
		if (exerciseRecord.status !== 'in_progress') {
			throw new BadRequestException(`Assessment is not in progress (status: ${exerciseRecord.status})`);
		}

		const questionBelongs = await this.verifyQuestionBelongs(
			exerciseRecord.refType,
			exerciseRecord.refId,
			questionId,
		);
		if (!questionBelongs) throw new BadRequestException('Question does not belong to this assessment');

		// Lưu audio buffer vào tmp file trên server filesystem
		// Job sẽ đọc file này để chạy Whisper + Azure
		const tmpPath = path.join(os.tmpdir(), `speaking_${exerciseRecordId}_${Date.now()}.webm`);
		fs.writeFileSync(tmpPath, file.buffer);
		this.logger.log(`[SpeakingAnswer] Audio saved | size=${file.size} | tmpPath=${tmpPath}`);

		// Lấy thông tin câu hỏi để build job data
		const question = await this.prisma.question.findUnique({
			where: { questionId },
			select: QuestionSelect.grade,
		});

		const placementSession = await this.prisma.placementSession.findFirst({
			where: { userId, status: 'completed' as any },
			orderBy: { completedAt: 'desc' },
			select: { cefrLevel: true },
		});
		const cefrLevel = placementSession?.cefrLevel ?? 'B1';
		const scoringJson = question?.payload?.scoringJson as any;

		// Upsert Answer record (speaking answer có thể được re-submit trước khi complete)
		const existing = await this.prisma.answer.findFirst({
			where: { exerciseRecordId, questionId, deletedAt: null },
			select: AnswerSelect.idOnly,
		});

		let answerId: string;
		if (existing) {
			answerId = existing.answerId;
			// Xóa AnswerDetail cũ nếu có (từ lần submit trước)
			await this.prisma.answerDetail.deleteMany({ where: { answerId } });
			this.logger.log(`[SpeakingAnswer] Re-submit | answerId=${answerId}`);
		} else {
			const newAnswer = await this.prisma.answer.create({
				data: {
					userId,
					exerciseRecordId,
					questionId,
					gradingStatus: 'pending' as any,
					submittedAt: new Date(),
				},
				select: AnswerSelect.idOnly,
			});
			answerId = newAnswer.answerId;
		}

		// Đẩy job — job sẽ chạy Whisper + Azure + Groq
		await this.bullmq.addJob<GradeSubjectiveJobData>(AssessmentQueues.ASSESSMENT_AI, AssessmentJob.GRADE_SPEAKING, {
			answerId,
			exerciseRecordId,
			questionType: 'speaking',
			textAnswer: '', // sẽ được fill bởi job sau Whisper
			stemText: question?.translations?.[0]?.stemText ?? '',
			cefrLevel,
			minWords: scoringJson?.minWords ?? 0,
			maxWords: scoringJson?.maxWords ?? 9999,
			userId,
			pronunciationScores: null,
			audioTmpPath: tmpPath,
			audioMimetype: file.mimetype,
		});

		this.logger.log(
			`[SpeakingAnswer] Job queued | exerciseRecordId=${exerciseRecordId} | questionId=${questionId} | answerId=${answerId}`,
		);

		return ResponseDto.success(
			Object,
			{ answerId, questionId, gradingStatus: 'pending', saved: true },
			'Speaking answer queued for processing',
		);
	}

	// 4. COMPLETE ASSESSMENT
	async completeAssessment(userId: string, exerciseRecordId: string) {
		const exerciseRecord = await this.prisma.exerciseRecord.findFirst({
			where: { exerciseRecordId, userId, deletedAt: null },
			select: ExerciseRecordSelect.statusRef,
		});
		if (!exerciseRecord) throw new NotFoundException('Assessment not found');
		if (exerciseRecord.status !== 'in_progress') {
			throw new BadRequestException(`Assessment already completed (status: ${exerciseRecord.status})`);
		}

		const allQuestionIds = await this.getAllQuestionIds(exerciseRecord.refType, exerciseRecord.refId);

		const answer = await this.prisma.answer.findMany({
			where: { exerciseRecordId, deletedAt: null },
			select: AnswerSelect.withAnswers,
		});
		const answeredIds = new Set(answer.map((a) => a.questionId));
		const unanswered = allQuestionIds.filter((id) => !answeredIds.has(id));
		if (unanswered.length > 0) throw new BadRequestException(`${unanswered.length} question(s) not answered yet`);

		const questions = await this.prisma.question.findMany({
			where: { questionId: { in: allQuestionIds }, deletedAt: null },
			select: QuestionSelect.grade,
		});
		const questionMap = new Map(questions.map((q) => [q.questionId, q]));

		// RAG: Fetch user's current CEFR level
		const placementSession = await this.prisma.placementSession.findFirst({
			where: { userId, status: 'completed' as any },
			orderBy: { completedAt: 'desc' },
			select: { cefrLevel: true },
		});
		const userCefrLevel = placementSession?.cefrLevel ?? 'B1';

		let objectiveTotal = 0;
		let objectiveScore = 0;

		// Speaking answers submitted via /speaking-answer endpoint không có answerDetails
		// Job đã được queue sẵn trong submitSpeakingAnswer — không queue lại
		let hasPendingSpeaking = false;

		const subjectiveAttempts: {
			answerId: string;
			type: string;
			textAnswer: string;
			stemText: string;
			minWords: number;
			maxWords: number;
			pronunciationScores: any | null;
		}[] = [];

		for (const attempt of answer) {
			const q = questionMap.get(attempt.questionId);
			if (!q) continue;

			if (q.type === 'dictation') {
				const userText = attempt.answerDetails[0]?.textAnswer ?? '';
				const keys = (q.payload?.answerKeysJson as string[]) ?? [];
				const expectedText = keys[0] ?? '';
				const diff = this.gradeDictation(expectedText, userText);

				objectiveTotal++;
				objectiveScore += diff.score;

				await this.prisma.answer.update({
					where: { answerId: attempt.answerId },
					data: {
						correct: diff.score >= 0.7,
						score: diff.score,
						gradingStatus: 'auto_scored' as any,
					},
				});

				// Lưu diff vào AnswerEvaluation
				await this.prisma.answerEvaluation.create({
					data: {
						answerId: attempt.answerId,
						overallScore: Math.round(diff.score * 10 * 10) / 10,
						criteriaJson: {
							dimensions: [
								{
									name: 'Word Accuracy',
									score: Math.round(diff.score * 10 * 10) / 10,
									comment: `${Math.round(diff.score * 100)}% of words matched correctly`,
								},
							],
							corrections: diff.corrections,
							suggestions: diff.suggestions,
						},
					},
				});
			} else if (OBJECTIVE_TYPES.includes(q.type)) {
				objectiveTotal++;
				const isCorrect = this.gradeObjective(q, attempt.answerDetails);
				const score = isCorrect ? 1.0 : 0.0;
				objectiveScore += score;

				await this.prisma.answer.update({
					where: { answerId: attempt.answerId },
					data: {
						correct: isCorrect,
						score: score,
						gradingStatus: 'auto_scored' as any,
					},
				});
			} else if (SUBJECTIVE_TYPES.includes(q.type)) {
				// Speaking fire-and-forget: answerDetails rỗng → job đã được queue
				// Chỉ cần đánh dấu hasPendingSpeaking để set status=submitted
				if (q.type === 'speaking' && attempt.answerDetails.length === 0) {
					hasPendingSpeaking = true;
					continue;
				}

				// Essay / short_answer (hoặc speaking cũ nếu có answerDetails)
				const textAnswer = attempt.answerDetails[0]?.textAnswer ?? '';
				const scoringJson = q.payload?.scoringJson as any;
				subjectiveAttempts.push({
					answerId: attempt.answerId,
					type: q.type,
					textAnswer,
					stemText: q.translations?.[0]?.stemText ?? '',
					minWords: scoringJson?.minWords ?? 0,
					maxWords: scoringJson?.maxWords ?? 9999,
					pronunciationScores: (() => {
						const pronDetail = attempt.answerDetails.find((d) => d.position === 2);
						if (!pronDetail?.textAnswer) return null;
						try {
							return JSON.parse(pronDetail.textAnswer);
						} catch {
							return null;
						}
					})(),
				});
			}
		}

		const hasSubjective = subjectiveAttempts.length > 0 || hasPendingSpeaking;
		const totalQuestions = allQuestionIds.length;

		if (!hasSubjective) {
			const finalScore = totalQuestions > 0 ? (objectiveScore / totalQuestions) * 100 : 0;

			await this.prisma.exerciseRecord.update({
				where: { exerciseRecordId },
				data: {
					status: 'scored' as any,
					score: Math.round(finalScore * 100) / 100,
					completedAt: new Date(),
				},
			});

			this.logger.log(
				`Exercise scored | exerciseRecord=${exerciseRecord.exerciseRecordId} | score=${finalScore}%`,
			);

			await this.markPlanItemCompleted(userId, exerciseRecord.refType, exerciseRecord.refId, finalScore);
		} else {
			const partialScore = totalQuestions > 0 ? (objectiveScore / totalQuestions) * 100 : null;

			await this.prisma.exerciseRecord.update({
				where: { exerciseRecordId },
				data: {
					status: 'submitted' as any,
					score: partialScore !== null ? Math.round(partialScore * 100) / 100 : null,
					completedAt: new Date(),
				},
			});

			// Chỉ queue job cho essay/short_answer (không phải speaking fire-and-forget)
			for (const sub of subjectiveAttempts) {
				await this.bullmq.addJob<GradeSubjectiveJobData>(
					AssessmentQueues.ASSESSMENT_AI,
					sub.type === 'speaking' ? AssessmentJob.GRADE_SPEAKING : AssessmentJob.GRADE_WRITING,
					{
						answerId: sub.answerId,
						exerciseRecordId,
						questionType: sub.type,
						textAnswer: sub.textAnswer,
						stemText: sub.stemText,
						cefrLevel: userCefrLevel,
						minWords: sub.minWords,
						maxWords: sub.maxWords,
						userId,
						pronunciationScores: sub.pronunciationScores ?? null,
					},
				);
			}

			this.logger.log(
				`Assessment submitted | exerciseRecordId=${exerciseRecordId} | subjective=${subjectiveAttempts.length} | pendingSpeaking=${hasPendingSpeaking}`,
			);
		}

		return this.getAssessmentResult(userId, exerciseRecordId);
	}

	// 5. GET RESULT
	async getAssessmentResult(userId: string, exerciseRecordId: string) {
		const exerciseRecord = await this.prisma.exerciseRecord.findFirst({
			where: { exerciseRecordId, userId, deletedAt: null },
			select: ExerciseRecordSelect.result,
		});

		if (!exerciseRecord) throw new NotFoundException('Assessment not found');

		const totalQuestions = exerciseRecord.answers.length;
		const correctCount = exerciseRecord.answers.filter(
			(a) => a.correct === true || (a.score !== null && Number(a.score) > 0),
		).length;

		const isScored = exerciseRecord.status === 'scored';

		const answersResult: AnswerResult[] = exerciseRecord.answers.map((ans) => {
			const q = ans.question;
			const questionType = q.type as string;
			const isCorrect = ans.correct;
			const earnedScore = ans.score !== null ? Number(ans.score) : null;
			const maxScore = q.maxScore ?? 1;

			const userAnswer = (() => {
				if (ans.answerDetails.length === 0) return null;
				if (['fill_blank', 'essay', 'speaking', 'matching', 'dictation'].includes(questionType)) {
					return { textAnswer: ans.answerDetails[0]?.textAnswer ?? undefined };
				}
				const optionIds = ans.answerDetails.filter((d) => d.optionId).map((d) => d.optionId as string);
				const optionTexts = optionIds.map((id) => {
					const opt = q.options.find((o) => o.optionId === id);
					return opt?.translations[0]?.optionText ?? id;
				});
				return optionIds.length > 0 ? { optionIds, optionTexts } : null;
			})();

			const correctAnswer = (() => {
				if (!isScored) return null;

				if (questionType === 'fill_blank' || questionType === 'dictation') {
					const keys = q.payload?.answerKeysJson as string[] | null;
					return keys && keys.length > 0 ? { textAnswers: keys } : null;
				}

				if (questionType === 'mcq_single' || questionType === 'mcq_multi') {
					const correctOptions = q.options.filter((o) => o.isCorrect);
					const optionIds = correctOptions.map((o) => o.optionId);
					const optionTexts = correctOptions.map((o) => o.translations[0]?.optionText ?? '');
					return optionIds.length > 0 ? { optionIds, optionTexts } : null;
				}

				if (questionType === 'matching') {
					const correctMap = q.payload?.answerKeysJson as Record<string, string> | null;
					return correctMap ? { textAnswers: [JSON.stringify(correctMap)] } : null;
				}

				return null;
			})();

			//─ BUILD aiFeedback─
			const aiFeedback = (() => {
				const evalRecord = ans.evaluations[0];
				if (!evalRecord) return null;

				let criteria: any = null;
				try {
					criteria =
						typeof evalRecord.criteriaJson === 'string'
							? JSON.parse(evalRecord.criteriaJson)
							: evalRecord.criteriaJson;
				} catch {
					return null;
				}

				if (!criteria) return null;

				// Pronunciation scores (speaking only — raw Azure scores stored for result page)
				const pronunciationScores = criteria.pronunciationScores ?? null;

				// criterionBands: map to { name, bandEstimate, internalScore, summary, strengths, weaknesses }
				const criterionBands = (criteria.criterionBands ?? []).map((c: any) => ({
					name: c.name,
					bandEstimate: c.bandEstimate ?? null,
					internalScore: c.internalScore ?? null,
					summary: c.summary ?? '',
					strengths: c.strengths ?? [],
					weaknesses: c.weaknesses ?? [],
					subCriteria: c.subCriteria ?? [],
				}));

				return {
					overallScore: Number(evalRecord.overallScore ?? 0),
					estimatedIeltsBand: criteria.estimatedIeltsBand ?? null,
					nextBandTarget: criteria.nextBandTarget ?? null,
					scoreConfidence: criteria.scoreConfidence ?? 'medium',
					wordCount: criteria.wordCount ?? null,
					wordCountStatus: criteria.wordCountStatus ?? null,
					criterionBands,
					corrections: criteria.corrections ?? [],
					priorityFixes: criteria.priorityFixes ?? [],
					nextLevelGaps: criteria.nextLevelGaps ?? [],
					styleImprovements: criteria.styleImprovements ?? [],
					correctedText: criteria.correctedText ?? null,
					paragraphFeedback: criteria.paragraphFeedback ?? [],
					pronunciationScores,
					validationWarnings: criteria.validationWarnings ?? [],
					requiresReview: criteria.requiresReview ?? false,
					reviewReason: criteria.reviewReason ?? null,
				};
			})();

			return {
				answerId: ans.answerId,
				questionId: ans.questionId,
				questionType,
				stemText: q.translations[0]?.stemText ?? null,
				maxScore,
				earnedScore,
				isCorrect,
				gradingStatus: ans.gradingStatus,
				userAnswer,
				correctAnswer,
				aiFeedback,
			} as AnswerResult;
		});

		const response: AssessmentResultResponse = {
			exerciseRecordId,
			refType: exerciseRecord.refType as string,
			status: exerciseRecord.status as string,
			score: exerciseRecord.score !== null ? Number(exerciseRecord.score) : null,
			totalQuestions,
			correctCount,
			startedAt: exerciseRecord.startedAt,
			completedAt: exerciseRecord.completedAt,
			answers: answersResult,
		};

		return ResponseDto.success(Object, response, 'Assessment result fetched');
	}

	// 6. GET HISTORY
	async getHistory(userId: string, dto: ListAssessmentHistoryDto) {
		const { pageIndex, pageSize, refType, skillName } = dto;
		const skip = (pageIndex - 1) * pageSize;

		const where: any = {
			userId,
			deletedAt: null,
			status: { in: ['submitted', 'scored'] as any[] },
			...(refType && { refType }),
		};

		const [rawRows, count] = await Promise.all([
			this.prisma.exerciseRecord.findMany({
				where,
				select: ExerciseRecordSelect.history,
				orderBy: { createdAt: 'desc' },
				skip,
				take: pageSize,
			}),
			this.prisma.exerciseRecord.count({ where }),
		]);

		const rows: AssessmentHistoryItem[] = await Promise.all(
			rawRows.map((a) => this.enrichHistoryItem(a, skillName)),
		);

		const filtered = skillName ? rows.filter((r) => r.skillName === skillName) : rows;

		return ResponseDto.success(
			Object,
			new PagingDataDto({ count: skillName ? filtered.length : count, rows: filtered }),
		);
	}

	// BULLMQ WORKER HANDLER
	private async checkAndUpdateCefrLevel(userId: string, currentLevel: string): Promise<void> {
		try {
			const NEXT_LEVEL: Record<string, string | null> = {
				A1: 'A2',
				A2: 'B1',
				B1: 'B2',
				B2: 'C1',
				C1: null,
			};
			const nextLevel = NEXT_LEVEL[currentLevel];
			if (!nextLevel) return;

			const recentEvals = await this.prisma.answerEvaluation.findMany({
				where: {
					answer: {
						userId,
						question: { type: { in: ['essay', 'speaking'] as any } },
						deletedAt: null,
					},
				},
				orderBy: { createdAt: 'desc' },
				take: 3,
				select: { overallScore: true },
			});

			if (recentEvals.length < 3) return;

			const allHigh = recentEvals.every((e) => Number(e.overallScore) >= 7.5);
			if (!allHigh) return;

			await this.prisma.placementSession.updateMany({
				where: { userId, status: 'completed' as any },
				data: { cefrLevel: nextLevel as any },
			});

			this.logger.log(`🎉 Level up! userId=${userId} | ${currentLevel} → ${nextLevel}`);
		} catch (err) {
			this.logger.warn(`checkAndUpdateCefrLevel failed | userId=${userId} | error=${err.message}`);
		}
	}

	private async handleGradeJob(job: Job<GradeSubjectiveJobData>): Promise<void> {
		const {
			answerId,
			exerciseRecordId,
			questionType,
			stemText,
			cefrLevel,
			minWords,
			maxWords,
			userId,
			audioTmpPath,
			audioMimetype,
		} = job.data;

		let textAnswer = job.data.textAnswer;
		let pronunciationScores: PronunciationScores | null = job.data.pronunciationScores ?? null;

		// Audio flow (fire-and-forget speaking)
		if (audioTmpPath) {
			this.logger.log(`[GradeJob] Audio flow | answerId=${answerId} | tmpPath=${audioTmpPath}`);

			try {
				if (!fs.existsSync(audioTmpPath)) {
					this.logger.error(`[GradeJob] Tmp file not found: ${audioTmpPath} — score=0`);
					await this.prisma.answer.update({
						where: { answerId },
						data: { score: 0, gradingStatus: 'auto_scored' as any },
					});
					return;
				}

				const audioBuffer = fs.readFileSync(audioTmpPath);

				try {
					fs.unlinkSync(audioTmpPath);
				} catch {}

				// [1] Whisper to transcript
				const transcriptRaw = await this.aiClient.transcribeAudio({
					buffer: audioBuffer,
					mimetype: audioMimetype ?? 'audio/webm',
					originalname: 'recording.webm',
				});
				textAnswer =
					typeof transcriptRaw === 'string' ? transcriptRaw : ((transcriptRaw as any)?.transcript ?? '');

				this.logger.log(`[GradeJob] Whisper done | transcript length=${textAnswer.length}`);

				// [2] Azure to pronunciation scores (non-blocking — nếu fail thì grading vẫn tiếp tục)
				if (textAnswer.trim()) {
					try {
						pronunciationScores = await this.aiClient.assessPronunciation({
							buffer: audioBuffer,
							mimetype: audioMimetype ?? 'audio/webm',
							referenceText: textAnswer,
						});
						if (pronunciationScores) {
							this.logger.log(
								`[GradeJob] Azure done | composite=${pronunciationScores.pronComposite} | words=${pronunciationScores.words?.length ?? 0}`,
							);
						} else {
							this.logger.warn('[GradeJob] Azure returned null — continuing without pron scores');
						}
					} catch (err) {
						this.logger.warn(`[GradeJob] Azure failed — continuing: ${err.message}`);
						pronunciationScores = null;
					}
				}

				// [3] Lưu AnswerDetails vào DB
				await this.prisma.answerDetail.deleteMany({ where: { answerId } }); // xóa placeholder nếu có
				const detailsData: { answerId: string; position: number; textAnswer: string }[] = [
					{ answerId, position: 1, textAnswer },
				];
				if (pronunciationScores) {
					detailsData.push({
						answerId,
						position: 2,
						textAnswer: JSON.stringify(pronunciationScores),
					});
				}
				await this.prisma.answerDetail.createMany({ data: detailsData });
				this.logger.log(
					`[GradeJob] AnswerDetails saved | positions=${detailsData.map((d) => d.position).join(',')}`,
				);
			} catch (err) {
				this.logger.error(`[GradeJob] Audio processing failed: ${err.message}`);
				await this.prisma.answer.update({
					where: { answerId },
					data: { score: 0, gradingStatus: 'auto_scored' as any },
				});
				return;
			}
		}

		// Early exit nếu không có text
		if (!textAnswer || textAnswer.trim().length === 0) {
			await this.prisma.answer.update({
				where: { answerId },
				data: { score: 0, gradingStatus: 'auto_scored' as any },
			});
			return;
		}

		// Groq grading
		const result = await this.aiClient.gradeSubmission({
			questionType,
			userText: textAnswer,
			stemText,
			cefrLevel,
			minWords,
			maxWords,
		});

		// Merge Pronunciation band vào criterionBands cho speaking
		if (questionType === 'speaking') {
			const pronBand: any = pronunciationScores
				? {
						name: 'Pronunciation',
						bandEstimate: pronunciationScores.estimatedBand,
						internalScore: Math.round((pronunciationScores.pronComposite / 100) * 10 * 2) / 2,
						summary: `Accuracy: ${pronunciationScores.accuracyScore}% | Fluency: ${pronunciationScores.fluencyScore}% | Composite: ${pronunciationScores.pronComposite}%`,
						strengths:
							pronunciationScores.pronComposite >= 75
								? ['Pronunciation is generally clear and intelligible']
								: [],
						weaknesses: (pronunciationScores.words ?? [])
							.filter((w: any) => w.errorType && w.errorType !== 'None' && w.accuracyScore < 60)
							.slice(0, 2)
							.map((w: any) => `"${w.word}" — accuracy ${w.accuracyScore}%`),
						subCriteria: [],
					}
				: {
						name: 'Pronunciation',
						bandEstimate: null,
						internalScore: 0,
						summary:
							'Pronunciation could not be assessed — audio format incompatible or Azure unavailable.',
						strengths: [],
						weaknesses: [],
						subCriteria: [],
					};

			result.criterionBands = [...(result.criterionBands ?? []), pronBand];

			const validBands = result.criterionBands
				.map((c: any) => Number(c.bandEstimate))
				.filter((n: number) => !isNaN(n) && n >= 0 && n <= 9);

			if (validBands.length === 4) {
				result.estimatedIeltsBand =
					Math.round((validBands.reduce((s: number, b: number) => s + b, 0) / 4) * 2) / 2;
			} else {
				const llmBands = (result.criterionBands ?? [])
					.filter((c: any) => c.name !== 'Pronunciation')
					.map((c: any) => Number(c.bandEstimate))
					.filter((n: number) => !isNaN(n) && n >= 0 && n <= 9);

				if (llmBands.length === 3) {
					result.estimatedIeltsBand =
						Math.round((llmBands.reduce((s: number, b: number) => s + b, 0) / 3) * 2) / 2;
				}
			}
		}

		await this.prisma.answerEvaluation.create({
			data: {
				answerId,
				overallScore: result.overallScore ?? result.internalScore ?? 0,
				criteriaJson: {
					assessmentType: result.assessmentType ?? null,
					currentLevel: result.currentLevel ?? null,
					targetLevel: result.targetLevel ?? null,
					currentBand: result.currentBand ?? null,
					targetBand: result.targetBand ?? null,
					estimatedIeltsBand: result.estimatedIeltsBand ?? null,
					internalScore: result.internalScore ?? result.overallScore ?? 0,
					overallScore: result.overallScore ?? result.internalScore ?? 0,
					scoreConfidence: result.scoreConfidence ?? 'medium',
					scoreRationale: result.scoreRationale ?? '',
					wordCount: result.wordCount ?? 0,
					wordCountStatus: result.wordCountStatus ?? '',
					criterionBands: result.criterionBands ?? [],
					corrections: result.corrections ?? [],
					priorityFixes: result.priorityFixes ?? [],
					nextLevelGaps: result.nextLevelGaps ?? [],
					nextBandTarget: result.nextBandTarget ?? null,
					styleImprovements: result.styleImprovements ?? [],
					correctedText: result.correctedText ?? null,
					paragraphFeedback: result.paragraphFeedback ?? [],
					pronunciationConfidence: result.pronunciationConfidence ?? null,
					pronunciationScores: (pronunciationScores ?? null) as any,
					validationWarnings: result.validationWarnings ?? [],
					requiresReview: result.requiresReview ?? false,
					reviewReason: result.reviewReason ?? null,
				},
			},
		});

		await this.prisma.answer.update({
			where: { answerId },
			data: {
				score: (result.overallScore ?? result.internalScore ?? 0) / 10,
				gradingStatus: 'auto_scored' as any,
			},
		});

		await this.tryFinalizeAssessment(exerciseRecordId);
		await this.checkAndUpdateCefrLevel(userId, cefrLevel);
	}

	private async tryFinalizeAssessment(exerciseRecordId: string): Promise<void> {
		const pendingAttempts = await this.prisma.answer.count({
			where: { exerciseRecordId, gradingStatus: 'pending', deletedAt: null },
		});

		if (pendingAttempts > 0) return;

		const allAttempts = await this.prisma.answer.findMany({
			where: { exerciseRecordId, deletedAt: null },
			select: AnswerSelect.scoreOnly,
		});

		const totalScore = allAttempts.reduce((sum, a) => sum + Number(a.score ?? 0), 0);
		const finalScore = allAttempts.length > 0 ? (totalScore / allAttempts.length) * 100 : 0;

		await this.prisma.exerciseRecord.update({
			where: { exerciseRecordId },
			data: {
				status: 'scored' as any,
				score: Math.round(finalScore * 100) / 100,
			},
		});

		this.logger.log(`Assessment finalized | assessmentId=${exerciseRecordId} | finalScore=${finalScore}%`);

		const assessment = await this.prisma.exerciseRecord.findUnique({
			where: { exerciseRecordId },
			select: ExerciseRecordSelect.userRef,
		});
		if (assessment) {
			await this.markPlanItemCompleted(assessment.userId, assessment.refType, assessment.refId, finalScore);
		}
	}

	// PRIVATE HELPERS

	private gradeDictation(
		expected: string,
		userInput: string,
	): {
		score: number;
		corrections: { original: string; corrected: string; rule: string }[];
		suggestions: string[];
	} {
		const normalize = (s: string) =>
			s
				.toLowerCase()
				.replace(/[.,!?;:'"()\-]/g, '')
				.replace(/\s+/g, ' ')
				.trim();

		const expWords = expected.trim().split(/\s+/).filter(Boolean);
		const usrWords = userInput.trim().split(/\s+/).filter(Boolean);

		if (expWords.length === 0) return { score: 1, corrections: [], suggestions: [] };

		if (usrWords.length === 0) {
			return {
				score: 0,
				corrections: expWords.slice(0, 5).map((w) => ({ original: '', corrected: w, rule: 'Missing word' })),
				suggestions: ['Listen to the audio again before writing.', 'Try writing each word as you hear it.'],
			};
		}

		const expNorm = expWords.map(normalize);
		const usrNorm = usrWords.map(normalize);
		const m = expNorm.length;
		const n = usrNorm.length;

		const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
		for (let i = 1; i <= m; i++) {
			for (let j = 1; j <= n; j++) {
				dp[i][j] =
					expNorm[i - 1] === usrNorm[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
			}
		}

		const lcsLength = dp[m][n];
		const score = lcsLength / m;

		const missingFromUser: string[] = [];
		const extraFromUser: string[] = [];

		let i = m,
			j = n;
		while (i > 0 || j > 0) {
			if (i > 0 && j > 0 && expNorm[i - 1] === usrNorm[j - 1]) {
				i--;
				j--;
			} else if (i > 0 && (j === 0 || dp[i - 1][j] >= dp[i][j - 1])) {
				missingFromUser.push(expWords[i - 1]);
				i--;
			} else {
				extraFromUser.push(usrWords[j - 1]);
				j--;
			}
		}

		missingFromUser.reverse();
		extraFromUser.reverse();

		const corrections: { original: string; corrected: string; rule: string }[] = [];
		const pairCount = Math.min(missingFromUser.length, extraFromUser.length);

		for (let k = 0; k < pairCount; k++) {
			corrections.push({ original: extraFromUser[k], corrected: missingFromUser[k], rule: 'Wrong word' });
		}
		for (let k = pairCount; k < missingFromUser.length; k++) {
			corrections.push({ original: '', corrected: missingFromUser[k], rule: 'Missing word' });
		}

		const accuracy = Math.round(score * 100);
		const suggestions =
			accuracy < 50
				? ['Listen to the audio multiple times before writing.', 'Focus on catching individual words clearly.']
				: accuracy < 80
					? [
							'Pay attention to smaller words like articles and prepositions.',
							'Review spelling of common words.',
						]
					: [
							'Great effort! Review the few words you missed.',
							'Practice punctuation in dictation exercises.',
						];

		return { score, corrections: corrections.slice(0, 5), suggestions };
	}

	private async verifyQuestionBelongs(refType: string, refId: string, questionId: string): Promise<boolean> {
		if (refType === 'lesson') {
			const link = await this.prisma.lessonQuestion.findFirst({ where: { lessonId: refId, questionId } });
			return !!link;
		}
		if (refType === 'question_set') {
			const link = await this.prisma.questionSetItem.findFirst({ where: { questionSetId: refId, questionId } });
			return !!link;
		}
		return false;
	}

	private async getAllQuestionIds(refType: string, refId: string): Promise<string[]> {
		if (refType === 'lesson') {
			const links = await this.prisma.lessonQuestion.findMany({
				where: { lessonId: refId },
				select: LessonQuestionSelect.idOnly,
			});
			return links.map((l) => l.questionId);
		}
		if (refType === 'question_set') {
			const links = await this.prisma.questionSetItem.findMany({
				where: { questionSetId: refId },
				select: QuestionSetItemSelect.idOnly,
			});
			return links.map((l) => l.questionId);
		}
		return [];
	}

	private async createAttemptAnswers(answerId: string, answer: SubmitAnswerDto['answer']): Promise<void> {
		if (answer.optionId) {
			await this.prisma.answerDetail.create({ data: { answerId, position: 1, optionId: answer.optionId } });
		} else if (answer.optionIds && answer.optionIds.length > 0) {
			await this.prisma.answerDetail.createMany({
				data: answer.optionIds.map((optionId, idx) => ({ answerId, position: idx + 1, optionId })),
			});
		} else if (answer.textAnswer !== undefined) {
			await this.prisma.answerDetail.create({
				data: { answerId, position: 1, textAnswer: answer.textAnswer },
			});

			if ((answer as any).pronunciationScores) {
				await this.prisma.answerDetail.create({
					data: {
						answerId,
						position: 2,
						textAnswer: JSON.stringify((answer as any).pronunciationScores),
					},
				});
			}
		}
	}

	private gradeObjective(
		question: {
			type: string;
			options: { optionId: string; isCorrect: boolean }[];
			payload: { answerKeysJson: any } | null;
		},
		answers: { optionId: string | null; textAnswer: string | null; position: number }[],
	): boolean {
		if (question.type === 'mcq_single') {
			const selected = answers[0]?.optionId;
			return question.options.some((o) => o.optionId === selected && o.isCorrect);
		}

		if (question.type === 'mcq_multi') {
			const selectedIds = new Set(answers.map((a) => a.optionId).filter(Boolean));
			const correctIds = new Set(question.options.filter((o) => o.isCorrect).map((o) => o.optionId));
			if (selectedIds.size !== correctIds.size) return false;
			for (const id of correctIds) {
				if (!selectedIds.has(id)) return false;
			}
			return true;
		}

		if (question.type === 'fill_blank') {
			const keys = question.payload?.answerKeysJson as string[] | null;
			if (!keys) return false;
			const userAnswer = answers[0]?.textAnswer?.trim().toLowerCase();
			return keys.map((k) => k.toLowerCase()).includes(userAnswer ?? '');
		}

		if (question.type === 'matching') {
			const correctAnswers = question.payload?.answerKeysJson as Record<string, string> | null;
			if (!correctAnswers) return false;
			const rawUserAnswer = answers[0]?.textAnswer;
			if (!rawUserAnswer) return false;
			try {
				const userAnswers = JSON.parse(rawUserAnswer) as Record<string, string>;
				const pairs = Object.entries(correctAnswers);
				if (pairs.length === 0) return false;
				return pairs.every(
					([left, right]) => userAnswers[left]?.trim().toLowerCase() === right.trim().toLowerCase(),
				);
			} catch {
				return false;
			}
		}

		return false;
	}

	private async enrichHistoryItem(
		assessment: {
			exerciseRecordId: string;
			refType: string;
			refId: string;
			status: string;
			score: any;
			startedAt: Date | null;
			completedAt: Date | null;
			createdAt: Date;
		},
		skillFilter?: string,
	): Promise<AssessmentHistoryItem> {
		let refTitle: string | null = null;
		let skillName: string | null = null;
		let cefrLevel: string | null = null;
		let totalQuestions = 0;

		if (assessment.refType === 'lesson') {
			const lesson = await this.prisma.lesson.findFirst({
				where: { lessonId: assessment.refId },
				select: LessonSelect.assessmentMeta,
			});
			refTitle = lesson?.title ?? null;
			skillName = lesson?.skillName ?? null;
			cefrLevel = lesson?.cefrLevel ?? null;
			totalQuestions = lesson?.lessonQuestions.length ?? 0;
		} else if (assessment.refType === 'question_set') {
			const session = await this.prisma.questionSet.findFirst({
				where: { questionSetId: assessment.refId },
				select: QuestionSetSelect.assessmentMeta,
			});
			refTitle = session?.title ?? null;
			skillName = session?.skillName ?? null;
			cefrLevel = session?.cefrLevel ?? null;
			totalQuestions = session?.items.length ?? 0;
		}

		const correctCount = await this.prisma.answer.count({
			where: { exerciseRecordId: assessment.exerciseRecordId, correct: true, deletedAt: null },
		});

		return {
			exerciseRecordId: assessment.exerciseRecordId,
			refType: assessment.refType,
			refId: assessment.refId,
			title: refTitle,
			skillName,
			cefrLevel,
			status: assessment.status,
			score: assessment.score !== null ? Number(assessment.score) : null,
			totalQuestions,
			correctCount,
			startedAt: assessment.startedAt,
			completedAt: assessment.completedAt,
		};
	}

	private async markPlanItemInProgress(userId: string, refType: string, refId: string): Promise<void> {
		try {
			await this.prisma.learningPlanItem.updateMany({
				where: { userId, refType, refId, status: 'pending', deletedAt: null },
				data: { status: 'in_progress' as any },
			});
		} catch (err) {
			this.logger.warn(`Failed to mark plan item in_progress: ${err.message}`);
		}
	}

	private async markPlanItemCompleted(userId: string, refType: string, refId: string, score: number): Promise<void> {
		try {
			const normalizedScore = Math.round((score / 10) * 100) / 100;
			await this.prisma.learningPlanItem.updateMany({
				where: {
					userId,
					refType,
					refId,
					status: { in: ['pending', 'in_progress'] },
					deletedAt: null,
				},
				data: { status: 'completed' as any, taskScore: normalizedScore },
			});
		} catch (err) {
			this.logger.warn(`Failed to mark plan item completed: ${err.message}`);
		}
	}
}
