import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { LESSON_LIST_SELECT, NotFoundException, PagingDataDto, ResponseDto, SKILL_LIST } from '@app/shared';
import { ListLessonsDto } from './dto/list-lessons.dto';
import { LessonSelect, QuestionSetSelect } from '../../../../../prisma/selects';
import { LessonDetail } from './interface/lesson-detail.interface';
import { QuestionItem } from './interface/question-item.interface';
import { ListQuestionSetsDto } from './dto/list-question-sets.dto';
import { QuestionSetDetail } from './interface/question-set-detail.interface';

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

	async getPracticeSessions(dto: ListQuestionSetsDto) {
		const { pageIndex, pageSize, skill, cefrLevel } = dto;

		const where = {
			deletedAt: null,
			isActive: true,
			...(skill && { skillName: skill }),
			...(cefrLevel && { cefrLevel }),
		};

		const [sessions, count] = await Promise.all([
			this.prisma.questionSet.findMany({
				where,
				select: QuestionSetSelect.list,
				orderBy: [{ cefrLevel: 'asc' }, { createdAt: 'asc' }],
				skip: (pageIndex - 1) * pageSize,
				take: pageSize,
			}),
			this.prisma.questionSet.count({ where }),
		]);

		const rows = sessions.map(({ _count, ...rest }) => ({
			...rest,
			questionCount: _count.items,
		}));

		return ResponseDto.success(Object, new PagingDataDto({ count, rows }));
	}

	async getPracticeSessionById(sessionId: string) {
		const questionSet = await this.prisma.questionSet.findFirst({
			where: { questionSetId: sessionId, deletedAt: null, isActive: true },
			select: QuestionSetSelect.detail,
		});

		if (!questionSet) throw new NotFoundException('Question Set not found');

		const result: QuestionSetDetail = {
			questionSetId: questionSet.questionSetId,
			skillName: questionSet.skillName,
			title: questionSet.title,
			description: questionSet.description,
			cefrLevel: questionSet.cefrLevel,
			estimatedMinutes: questionSet.estimatedMinutes,
			isActive: questionSet.isActive,
			questions: questionSet.items.map(({ position, question }) => this.formatQuestion(position, question)),
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
