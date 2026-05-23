import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { BadRequestException, NotFoundException, PagingDataDto, ResponseDto } from '@app/shared';
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

	// 3. SUBMIT ANSWER
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
		const subjectiveAttempts: {
			answerId: string;
			type: string;
			textAnswer: string;
			stemText: string;
			minWords: number;
			maxWords: number;
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
				const textAnswer = attempt.answerDetails[0]?.textAnswer ?? '';
				const scoringJson = q.payload?.scoringJson as any;
				subjectiveAttempts.push({
					answerId: attempt.answerId,
					type: q.type,
					textAnswer,
					stemText: q.translations?.[0]?.stemText ?? '',
					minWords: scoringJson?.minWords ?? 0,
					maxWords: scoringJson?.maxWords ?? 9999,
				});
			}
		}

		const hasSubjective = subjectiveAttempts.length > 0;
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
					},
				);
			}

			this.logger.log(
				`Assessment submitted | exerciseRecordId=${exerciseRecordId} | subjective=${subjectiveAttempts.length} pending`,
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

			// ─── BUILD aiFeedback ─────────────────────────────────────────────────────
			// FIX: map đầy đủ format mới + backward compat với data cũ trong DB
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
					criteria = null;
				}

				return {
					// ── Core scores ───────────────────────────────────────────────
					overallScore: Number(criteria?.overallScore ?? evalRecord.overallScore),
					estimatedIeltsBand: criteria?.estimatedIeltsBand ?? null,
					internalScore: criteria?.internalScore ?? Number(evalRecord.overallScore),
					scoreConfidence: criteria?.scoreConfidence ?? 'medium',
					scoreRationale: criteria?.scoreRationale ?? '',
					// ── Band info ─────────────────────────────────────────────────
					assessmentType: criteria?.assessmentType ?? null,
					currentLevel: criteria?.currentLevel ?? null,
					targetLevel: criteria?.targetLevel ?? null,
					currentBand: criteria?.currentBand ?? null,
					targetBand: criteria?.targetBand ?? null,

					wordCount: criteria?.wordCount ?? 0,
					wordCountStatus: criteria?.wordCountStatus ?? '',

					criterionBands: criteria?.criterionBands ?? [],
					corrections: criteria?.corrections ?? [],
					priorityFixes: criteria?.priorityFixes ?? [],
					nextLevelGaps: criteria?.nextLevelGaps ?? [],
					nextBandTarget: criteria?.nextBandTarget ?? null,
					styleImprovements: criteria?.styleImprovements ?? [],
					correctedText: criteria?.correctedText ?? null,
					pronunciationConfidence: criteria?.pronunciationConfidence ?? null,

					dimensions: (criteria?.dimensions ?? []).map((d: any) => ({
						name: d.name ?? '',
						score: Number(d.score ?? 0),
						feedback: d.comment ?? d.feedback ?? '',
					})),
					suggestions: criteria?.suggestions ?? [],
				};
			})();

			return {
				questionId: ans.questionId,
				questionType,
				stemText: ans.question.translations?.[0]?.stemText ?? null,
				gradingStatus: ans.gradingStatus as string,
				isCorrect,
				earnedScore,
				maxScore,
				userAnswer,
				correctAnswer,
				aiFeedback,
			};
		});

		const message =
			exerciseRecord.status === 'submitted' ? 'AI đang chấm bài, vui lòng kiểm tra lại sau.' : undefined;

		const result: AssessmentResultResponse = {
			exerciseRecordId: exerciseRecord.exerciseRecordId,
			refType: exerciseRecord.refType,
			status: exerciseRecord.status as string,
			score: exerciseRecord.score !== null ? Number(exerciseRecord.score) : null,
			totalQuestions,
			correctCount,
			startedAt: exerciseRecord.startedAt,
			completedAt: exerciseRecord.completedAt,
			message,
			answers: answersResult,
		};

		return ResponseDto.success(Object, result);
	}

	// 6. HISTORY
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

	async transcribeAudio(file: Express.Multer.File) {
		if (!file) throw new BadRequestException('No audio file provided');

		this.logger.log(`Transcribing audio | size=${file.size} | mimetype=${file.mimetype}`);
		const transcript = await this.aiClient.transcribeAudio({
			buffer: file.buffer,
			mimetype: file.mimetype,
			originalname: file.originalname,
		});

		console.log('transcript result:', transcript, typeof transcript);
		return ResponseDto.success(Object, { transcript }, 'Transcription successful');
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
			textAnswer,
			stemText,
			cefrLevel,
			minWords,
			maxWords,
			userId,
		} = job.data;

		if (!textAnswer || textAnswer.trim().length === 0) {
			await this.prisma.answer.update({
				where: { answerId },
				data: { score: 0, gradingStatus: 'auto_scored' as any },
			});
			return;
		}

		const result = await this.aiClient.gradeSubmission({
			questionType,
			userText: textAnswer,
			stemText,
			cefrLevel,
			minWords,
			maxWords,
		});

		// ─── FIX: Lưu đầy đủ format mới vào criteriaJson ─────────────────────────
		await this.prisma.answerEvaluation.create({
			data: {
				answerId,
				overallScore: result.overallScore ?? result.internalScore ?? 0,
				criteriaJson: {
					// Core metadata
					assessmentType: result.assessmentType ?? null,
					currentLevel: result.currentLevel ?? null,
					targetLevel: result.targetLevel ?? null,
					currentBand: result.currentBand ?? null,
					targetBand: result.targetBand ?? null,
					// Scores
					estimatedIeltsBand: result.estimatedIeltsBand ?? null,
					internalScore: result.internalScore ?? result.overallScore ?? 0,
					overallScore: result.overallScore ?? result.internalScore ?? 0,
					scoreConfidence: result.scoreConfidence ?? 'medium',
					scoreRationale: result.scoreRationale ?? '',
					// Word info
					wordCount: result.wordCount ?? 0,
					wordCountStatus: result.wordCountStatus ?? '',
					// Grading content
					criterionBands: result.criterionBands ?? [],
					corrections: result.corrections ?? [],
					priorityFixes: result.priorityFixes ?? [],
					nextLevelGaps: result.nextLevelGaps ?? [],
					nextBandTarget: result.nextBandTarget ?? null,
					styleImprovements: result.styleImprovements ?? [],
					correctedText: result.correctedText ?? null,
					pronunciationConfidence: result.pronunciationConfidence ?? null,
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

	/**
	 * LCS word-level diff cho dictation
	 */
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
			await this.prisma.answerDetail.create({ data: { answerId, position: 1, textAnswer: answer.textAnswer } });
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
