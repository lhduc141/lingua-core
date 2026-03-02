import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../guards/auth.guard';
import { Public } from '../../decorators/public.decorator';
import { LearningService } from './learning.service';
import { ListLessonsDto } from './dto/list-lessons.dto';
import { ListPracticeSessionsDto } from './dto/list-practice-sessions.dto';

@ApiTags('Learning')
@Controller()
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class LearningController {
	constructor(private readonly learningService: LearningService) {}

	@Get('skills')
	@Public()
	@ApiOperation({ summary: 'Danh sách skills hệ thống hỗ trợ' })
	@ApiOkResponse({ description: 'Skills list' })
	getSkills() {
		return this.learningService.getSkills();
	}

	@Get('lessons')
	@ApiOperation({ summary: 'Danh sách bài học đã published' })
	@ApiOkResponse({ description: 'Paginated lessons' })
	getLessons(@Query() query: ListLessonsDto) {
		return this.learningService.getLessons(query);
	}

	@Get('lessons/:lessonId')
	@ApiOperation({ summary: 'Chi tiết bài học' })
	@ApiOkResponse({ description: 'Lesson detail' })
	@ApiNotFoundResponse({ description: 'Lesson not found' })
	getLessonById(@Param('lessonId', ParseUUIDPipe) lessonId: string) {
		return this.learningService.getLessonById(lessonId);
	}

	@Get('practice-sessions')
	@ApiOperation({ summary: 'Danh sách practice sessions' })
	@ApiOkResponse({ description: 'Paginated practice sessions' })
	getPracticeSessions(@Query() query: ListPracticeSessionsDto) {
		return this.learningService.getPracticeSessions(query);
	}

	@Get('practice-sessions/:sessionId')
	@ApiOperation({ summary: 'Chi tiết practice session' })
	@ApiOkResponse({ description: 'Practice session detail' })
	@ApiNotFoundResponse({ description: 'Practice session not found' })
	getPracticeSessionById(@Param('sessionId', ParseUUIDPipe) sessionId: string) {
		return this.learningService.getPracticeSessionById(sessionId);
	}
}
