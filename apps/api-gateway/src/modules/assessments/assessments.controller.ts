import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../guards/auth.guard';
import { ReqUser } from '../../decorators/req-user.decorator';
import { AssessmentsService } from './assessments.service';
import { StartLessonAssessmentDto } from './dto/start-lesson-assessment.dto';
import { StartQuestionSetAssessmentDto } from './dto/start-question-set-assessment.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { ListAssessmentHistoryDto } from './dto/list-assessment-history.dto';

@ApiTags('Assessments')
@Controller('assessments')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class AssessmentsController {
	constructor(private readonly assessmentsService: AssessmentsService) {}

	@Get('history')
	@ApiOperation({ summary: 'Lịch sử tất cả các lần làm bài' })
	@ApiOkResponse({ description: 'Paginated assessment history' })
	getHistory(@ReqUser('userId') userId: string, @Query() query: ListAssessmentHistoryDto) {
		return this.assessmentsService.getHistory(userId, query);
	}

	@Post('lesson/start')
	@ApiOperation({ summary: 'Bắt đầu làm bài học (lesson)' })
	@ApiOkResponse({ description: 'Assessment created, questions returned (no isCorrect)' })
	@ApiNotFoundResponse({ description: 'Lesson not found or not published' })
	startLessonAssessment(@ReqUser('userId') userId: string, @Body() dto: StartLessonAssessmentDto) {
		return this.assessmentsService.startLessonAssessment(userId, dto);
	}

	@Post('question-set/start')
	@ApiOperation({ summary: 'Bắt đầu làm bài practice session' })
	@ApiOkResponse({ description: 'Assessment created, questions returned (no isCorrect)' })
	@ApiNotFoundResponse({ description: 'Practice session not found or inactive' })
	startQuestionSetAssessment(@ReqUser('userId') userId: string, @Body() dto: StartQuestionSetAssessmentDto) {
		return this.assessmentsService.startQuestionSetAssessment(userId, dto);
	}

	@Post(':assessmentId/answers')
	@ApiOperation({ summary: 'Submit đáp án 1 câu hỏi (gọi nhiều lần, mỗi câu 1 lần)' })
	@ApiOkResponse({ description: 'Answer saved. Không reveal isCorrect.' })
	@ApiNotFoundResponse({ description: 'Assessment or question not found' })
	submitAnswer(
		@ReqUser('userId') userId: string,
		@Param('assessmentId', ParseUUIDPipe) assessmentId: string,
		@Body() dto: SubmitAnswerDto,
	) {
		return this.assessmentsService.submitAnswer(userId, assessmentId, dto);
	}

	@Post(':assessmentId/complete')
	@ApiOperation({ summary: 'Nộp bài — chấm điểm. Objective: sync. Subjective: AI queue.' })
	@ApiOkResponse({ description: 'Assessment completed. status=scored hoặc submitted (AI pending)' })
	completeAssessment(@ReqUser('userId') userId: string, @Param('assessmentId', ParseUUIDPipe) assessmentId: string) {
		return this.assessmentsService.completeAssessment(userId, assessmentId);
	}

	@Get(':assessmentId/result')
	@ApiOperation({ summary: 'Xem kết quả. Poll endpoint này khi status=submitted.' })
	@ApiOkResponse({ description: 'Assessment result. status=submitted nghĩa là AI đang chấm.' })
	@ApiNotFoundResponse({ description: 'Assessment not found' })
	getResult(@ReqUser('userId') userId: string, @Param('assessmentId', ParseUUIDPipe) assessmentId: string) {
		return this.assessmentsService.getAssessmentResult(userId, assessmentId);
	}
}
