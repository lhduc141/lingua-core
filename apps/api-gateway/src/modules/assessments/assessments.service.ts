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

	//  Register BullMQ Worker khi module khởi động
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

		// Auto-track: mark plan item as in_progress
		await this.markPlanItemInProgress(userId, 'lesson', lessonId);

		const questions: AssessmentQuestion[] = lesson.lessonQuestions.map((lq) => ({
			questionId: lq.question.questionId,
			type: lq.question.type,
			position: lq.position,
			maxScore: lq.question.maxScore,
			stemText: lq.question.translations[0]?.stemText ?? null,
			contentJson: lq.question.translations[0]?.contentJson ?? null,
			passage: lq.question.passage
				? {
						passageId: lq.question.passage.passageId,
						title: lq.question.passage.title,
						content: lq.question.passage.content,
						cefrLevel: lq.question.passage.cefrLevel,
						wordCount: lq.question.passage.wordCount,
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

		// Auto-track: mark plan item as in_progress
		await this.markPlanItemInProgress(userId, 'question_set', questionSetId);

		const questions: AssessmentQuestion[] = questionSet.items.map((sq) => ({
			questionId: sq.question.questionId,
			type: sq.question.type,
			position: sq.position,
			maxScore: sq.question.maxScore,
			stemText: sq.question.translations[0]?.stemText ?? null,
			contentJson: sq.question.translations[0]?.contentJson ?? null,
			passage: sq.question.passage
				? {
						passageId: sq.question.passage.passageId,
						title: sq.question.passage.title,
						content: sq.question.passage.content,
						cefrLevel: sq.question.passage.cefrLevel,
						wordCount: sq.question.passage.wordCount,
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

		// 1. Verify assessment
		const exerciseRecord = await this.prisma.exerciseRecord.findFirst({
			where: { exerciseRecordId, userId, deletedAt: null },
			select: ExerciseRecordSelect.statusRef,
		});
		if (!exerciseRecord) throw new NotFoundException('Assessment not found');
		if (exerciseRecord.status !== 'in_progress') {
			throw new BadRequestException(`Assessment is not in progress (status: ${exerciseRecord.status})`);
		}

		// 2. Verify question thuộc assessment này
		const questionBelongs = await this.verifyQuestionBelongs(
			exerciseRecord.refType,
			exerciseRecord.refId,
			questionId,
		);
		if (!questionBelongs) {
			throw new BadRequestException('Question does not belong to this assessment');
		}

		const existing = await this.prisma.answer.findFirst({
			where: { exerciseRecordId, questionId, deletedAt: null },
			select: AnswerSelect.idOnly,
		});
		if (existing) throw new BadRequestException('This question has already been answered');

		// 5. Tạo Attempt
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

		// 6. Tạo AttemptAnswer(s)
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
		// 1. Verify assessment
		const exerciseRecord = await this.prisma.exerciseRecord.findFirst({
			where: { exerciseRecordId, userId, deletedAt: null },
			select: ExerciseRecordSelect.statusRef,
		});
		if (!exerciseRecord) throw new NotFoundException('Assessment not found');
		if (exerciseRecord.status !== 'in_progress') {
			throw new BadRequestException(`Assessment already completed (status: ${exerciseRecord.status})`);
		}

		// 2. Lấy tất cả questionIds của assessment này
		const allQuestionIds = await this.getAllQuestionIds(exerciseRecord.refType, exerciseRecord.refId);

		// 3. Kiểm tra tất cả câu đã có attempt chưa
		const answer = await this.prisma.answer.findMany({
			where: { exerciseRecordId, deletedAt: null },
			select: AnswerSelect.withAnswers,
		});
		const answeredIds = new Set(answer.map((a) => a.questionId));
		const unanswered = allQuestionIds.filter((id) => !answeredIds.has(id));
		if (unanswered.length > 0) throw new BadRequestException(`${unanswered.length} question(s) not answered yet`);

		// 4. Lấy question type để chấm điểm
		const questions = await this.prisma.question.findMany({
			where: { questionId: { in: allQuestionIds }, deletedAt: null },
			select: QuestionSelect.grade,
		});
		const questionMap = new Map(questions.map((q) => [q.questionId, q]));

		// 5. Grade objective questions
		let objectiveTotal = 0;
		let objectiveScore = 0;
		const subjectiveAttempts: { answerId: string; type: string; textAnswer: string }[] = [];

		for (const attempt of answer) {
			const q = questionMap.get(attempt.questionId);
			if (!q) continue;

			if (OBJECTIVE_TYPES.includes(q.type)) {
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
				subjectiveAttempts.push({
					answerId: attempt.answerId,
					type: q.type,
					textAnswer,
				});
			}
		}

		// 6. Xác định status + tính score
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

			// Auto-track: mark plan item as completed
			await this.markPlanItemCompleted(userId, exerciseRecord.refType, exerciseRecord.refId, finalScore);
		} else {
			// Có subjective → submitted, push vào queue
			const partialScore = totalQuestions > 0 ? (objectiveScore / totalQuestions) * 100 : null;

			await this.prisma.exerciseRecord.update({
				where: { exerciseRecordId },
				data: {
					status: 'submitted' as any,
					score: partialScore !== null ? Math.round(partialScore * 100) / 100 : null,
					completedAt: new Date(),
				},
			});

			// Push từng subjective attempt vào BullMQ
			for (const sub of subjectiveAttempts) {
				await this.bullmq.addJob<GradeSubjectiveJobData>(
					AssessmentQueues.ASSESSMENT_AI,
					sub.type === 'speaking' ? AssessmentJob.GRADE_SPEAKING : AssessmentJob.GRADE_WRITING,
					{
						answerId: sub.answerId,
						exerciseRecordId,
						questionType: sub.type,
						textAnswer: sub.textAnswer,
					},
				);
			}

			this.logger.log(
				`Assessment submitted | exerciseRecordId=${exerciseRecordId} | subjective=${subjectiveAttempts.length} pending`,
			);
		}

		// 7. Trả về result hiện tại
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
		const correctCount = exerciseRecord.answers.filter((a) => a.correct === true).length;

		const answersResult: AnswerResult[] = exerciseRecord.answers.map((ans) => {
			// Tìm correctOptionId (chỉ trả khi assessment đã scored)
			const isScored = ['scored'].includes(exerciseRecord.status as string);
			const correctOption = isScored ? ans.question.options.find((o) => o.isCorrect) : null;

			const evaluation = ans.evaluations[0]
				? {
						overallScore: Number(ans.evaluations[0].overallScore),
						criteriaJson: ans.evaluations[0].criteriaJson,
					}
				: null;

			return {
				answerId: ans.answerId,
				questionId: ans.questionId,
				type: ans.question.options.length > 0 ? 'objective' : 'subjective', // simplified
				correct: ans.correct,
				score: ans.score !== null ? Number(ans.score) : null,
				gradingStatus: ans.gradingStatus,
				correctOptionId: correctOption?.optionId ?? null,
				userAnswer: {
					optionId: ans.answerDetails[0]?.optionId ?? null,
					textAnswer: ans.answerDetails[0]?.textAnswer ?? null,
				},
				evaluation,
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
			status: { not: 'draft' }, // chỉ hiện bài đã bắt đầu
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

		// Enrich với title + skillName từ lesson/practice session
		const rows: AssessmentHistoryItem[] = await Promise.all(
			rawRows.map((a) => this.enrichHistoryItem(a, skillName)),
		);

		// Filter theo skillName nếu có (sau khi enrich)
		const filtered = skillName ? rows.filter((r) => r.skillName === skillName) : rows;

		return ResponseDto.success(
			Object,
			new PagingDataDto({ count: skillName ? filtered.length : count, rows: filtered }),
		);
	}

	// BULLMQ WORKER HANDLER
	private async handleGradeJob(job: Job<GradeSubjectiveJobData>): Promise<void> {
		const { answerId, exerciseRecordId, questionType, textAnswer } = job.data;

		if (!textAnswer || textAnswer.trim().length === 0) {
			// Không có text → cho 0 điểm
			await this.prisma.answer.update({
				where: { answerId },
				data: { score: 0, gradingStatus: 'auto_scored' as any },
			});
			return;
		}

		const result = await this.aiClient.gradeSubmission({ questionType, userText: textAnswer });

		await this.prisma.answerEvaluation.create({
			data: {
				answerId,
				overallScore: result.overallScore,
				criteriaJson: {
					dimensions: result.dimensions,
					corrections: result.corrections,
					suggestions: result.suggestions,
				},
			},
		});

		// Update Attempt.score (normalize 0-10 → 0-1)
		await this.prisma.answer.update({
			where: { answerId },
			data: {
				score: result.overallScore / 10,
				gradingStatus: 'auto_scored' as any,
			},
		});

		await this.tryFinalizeAssessment(exerciseRecordId);
	}

	private async tryFinalizeAssessment(exerciseRecordId: string): Promise<void> {
		const pendingAttempts = await this.prisma.answer.count({
			where: {
				exerciseRecordId,
				gradingStatus: 'pending',
				deletedAt: null,
			},
		});

		if (pendingAttempts > 0) return; // còn câu chưa chấm

		// Tính lại score tổng
		const allAttempts = await this.prisma.answer.findMany({
			where: { exerciseRecordId, deletedAt: null },
			select: AnswerSelect.scoreOnly,
		});

		const totalScore = allAttempts.reduce((sum, a) => sum + Number(a.score ?? 0), 0);
		const finalScore = allAttempts.length > 0 ? (totalScore / allAttempts.length) * 100 : 0;

		await this.prisma.exerciseRecord.update({
			where: { exerciseRecordId: exerciseRecordId },
			data: {
				status: 'scored' as any,
				score: Math.round(finalScore * 100) / 100,
			},
		});

		this.logger.log(`Assessment finalized | assessmentId=${exerciseRecordId} | finalScore=${finalScore}%`);

		// Auto-track: mark plan item as completed (async path)
		const assessment = await this.prisma.exerciseRecord.findUnique({
			where: { exerciseRecordId: exerciseRecordId },
			select: ExerciseRecordSelect.userRef,
		});
		if (assessment) {
			await this.markPlanItemCompleted(assessment.userId, assessment.refType, assessment.refId, finalScore);
		}
	}

	// PRIVATE HELPERS
	private async verifyQuestionBelongs(refType: string, refId: string, questionId: string): Promise<boolean> {
		if (refType === 'lesson') {
			const link = await this.prisma.lessonQuestion.findFirst({
				where: { lessonId: refId, questionId },
			});
			return !!link;
		}
		if (refType === 'question_set') {
			const link = await this.prisma.questionSetItem.findFirst({
				where: { questionSetId: refId, questionId },
			});
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
			// mcq_single
			await this.prisma.answerDetail.create({
				data: { answerId, position: 1, optionId: answer.optionId },
			});
		} else if (answer.optionIds && answer.optionIds.length > 0) {
			// mcq_multi
			await this.prisma.answerDetail.createMany({
				data: answer.optionIds.map((optionId, i) => ({
					answerId,
					position: i + 1,
					optionId,
				})),
			});
		} else if (answer.textAnswer !== undefined) {
			// essay / speaking / fill_blank
			await this.prisma.answerDetail.create({
				data: { answerId, position: 1, textAnswer: answer.textAnswer },
			});
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

		// Các loại khác (matching, ordering) → pending AI grading nếu cần
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

		return {
			exerciseRecordId: assessment.exerciseRecordId,
			refType: assessment.refType,
			refId: assessment.refId,
			refTitle,
			skillName,
			cefrLevel,
			status: assessment.status,
			score: assessment.score !== null ? Number(assessment.score) : null,
			totalQuestions,
			startedAt: assessment.startedAt,
			completedAt: assessment.completedAt,
		};
	}

	// Plan item auto-tracking: updateMany → safe (0 match = 0 update, no error)
	private async markPlanItemInProgress(userId: string, refType: string, refId: string): Promise<void> {
		try {
			await this.prisma.learningPlanItem.updateMany({
				where: {
					userId,
					refType,
					refId,
					status: 'pending',
					deletedAt: null,
				},
				data: { status: 'in_progress' as any },
			});
		} catch (err) {
			this.logger.warn(`Failed to mark plan item in_progress: ${err.message}`);
		}
	}

	// score param is 0-100 from Assessment; normalize to 0-10 to match custom activity scale + Decimal(4,2)
	private async markPlanItemCompleted(userId: string, refType: string, refId: string, score: number): Promise<void> {
		try {
			const normalizedScore = Math.round((score / 10) * 100) / 100; // 0-100 → 0-10
			await this.prisma.learningPlanItem.updateMany({
				where: {
					userId,
					refType,
					refId,
					status: { in: ['pending', 'in_progress'] },
					deletedAt: null,
				},
				data: {
					status: 'completed' as any,
					taskScore: normalizedScore,
				},
			});
		} catch (err) {
			this.logger.warn(`Failed to mark plan item completed: ${err.message}`);
		}
	}
}
