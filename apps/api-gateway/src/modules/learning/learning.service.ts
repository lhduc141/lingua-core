import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { LESSON_LIST_SELECT, NotFoundException, PagingDataDto, ResponseDto, SKILL_LIST } from '@app/shared';
import { ListLessonsDto } from './dto/list-lessons.dto';
import { LessonSelect, PracticeSessionSelect } from '../../../../../prisma/selects';
import { LessonDetail } from './interface/lesson-detail.interface';
import { PracticeSessionDetail } from './interface/practice-session-detail.interface';
import { QuestionItem } from './interface/question-item.interface';
import { ListPracticeSessionsDto } from './dto/list-practice-sessions.dto';

@Injectable()
export class LearningService {
	private readonly logger = new Logger(LearningService.name);

	constructor(private prisma: PrismaService) {}

	getSkills() {
		return ResponseDto.success(Object, SKILL_LIST);
	}

	async getLessons(dto: ListLessonsDto) {
		const { skill, cefrLevel, pageIndex, pageSize } = dto;
		const skip = (pageIndex - 1) * pageSize;

		const where = {
			deletedAt: null,
			status: 'published' as const,
			...(skill && { skillName: skill }),
			...(cefrLevel && { cefrLevel }),
		};

		const [rows, count] = await Promise.all([
			this.prisma.lesson.findMany({
				where,
				select: LESSON_LIST_SELECT,
				orderBy: [{ cefrLevel: 'asc' }, { createdAt: 'asc' }],
				skip,
				take: pageSize,
			}),
			this.prisma.lesson.count({ where }),
		]);

		return ResponseDto.success(Object, new PagingDataDto({ count, rows }));
	}

	async getLessonById(lessonId: string) {
		const lesson = await this.prisma.lesson.findFirst({
			where: {
				lessonId,
				deletedAt: null,
				status: 'published',
			},
			select: LessonSelect.detail,
		});

		if (!lesson) throw new NotFoundException('Lesson not found');

		const result: LessonDetail = {
			lessonId: lesson.lessonId,
			skillName: lesson.skillName,
			title: lesson.title,
			description: lesson.description,
			cefrLevel: lesson.cefrLevel,
			estimatedMinutes: lesson.estimatedMinutes,
			theoryContent: lesson.theoryContent,
			prerequisites: (lesson.prerequisites as string[]) ?? [],
			questions: lesson.lessonQuestions.map(({ position, question }) => this.formatQuestion(position, question)),
		};

		return ResponseDto.success(Object, result);
	}

	async getPracticeSessions(dto: ListPracticeSessionsDto) {
		const { pageIndex, pageSize, skill, cefrLevel } = dto;

		const where = {
			deletedAt: null,
			isActive: true,
			...(skill && { skillName: skill }),
			...(cefrLevel && { cefrLevel }),
		};

		const [sessions, count] = await Promise.all([
			this.prisma.practiceSession.findMany({
				where,
				select: PracticeSessionSelect.list,
				orderBy: [{ cefrLevel: 'asc' }, { createdAt: 'asc' }],
				skip: (pageIndex - 1) * pageSize,
				take: pageSize,
			}),
			this.prisma.practiceSession.count({ where }),
		]);

		const rows = sessions.map(({ _count, ...rest }) => ({
			...rest,
			questionCount: _count.questions,
		}));

		return ResponseDto.success(Object, new PagingDataDto({ count, rows }));
	}

	async getPracticeSessionById(sessionId: string) {
		const session = await this.prisma.practiceSession.findFirst({
			where: { sessionId, deletedAt: null, isActive: true },
			select: PracticeSessionSelect.detail,
		});

		if (!session) throw new NotFoundException('Practice session not found');

		const result: PracticeSessionDetail = {
			sessionId: session.sessionId,
			skillName: session.skillName,
			title: session.title,
			description: session.description,
			cefrLevel: session.cefrLevel,
			estimatedMinutes: session.estimatedMinutes,
			isActive: session.isActive,
			questions: session.questions.map(({ position, question }) => this.formatQuestion(position, question)),
		};

		return ResponseDto.success(Object, result);
	}

	private formatQuestion(position: number, question: any): QuestionItem {
		return {
			questionId: question.questionId,
			position,
			type: question.type,
			difficulty: question.difficulty,
			maxScore: question.maxScore,
			stemText: question.translations[0]?.stemText ?? null,
			contentJson: question.translations[0]?.contentJson ?? null,
			passage: question.passage ?? null,
			options: question.options.map((opt: any) => ({
				optionId: opt.optionId,
				position: opt.position,
				optionText: opt.translations[0]?.optionText ?? null,
			})),
		};
	}
}
