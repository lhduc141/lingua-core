import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
	ApiBadRequestResponse,
	ApiBearerAuth,
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiOperation,
	ApiTags,
} from '@nestjs/swagger';
import { ReqUser } from '../../decorators/req-user.decorator';
import { AuthGuard } from '../../guards/auth.guard';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { ListPlanHistoryDto } from './dto/list-plan-history.dto';
import { SubmitReviewFeedbackDto } from './dto/submit-review-feedback.dto';
import { UpdatePlanItemDto } from './dto/update-plan-item.dto';
import { LearningPlanService } from './learning-plan.service';

@ApiTags('Learning Plan')
@Controller('learning-plan')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class LearningPlanController {
	constructor(private readonly planService: LearningPlanService) {}

	@Get('current')
	@ApiOperation({ summary: 'Get current learning plan (grouped by day)' })
	@ApiOkResponse({ description: 'Current plan with daily tasks, auto-generates weekly review if due' })
	getCurrent(@ReqUser('userId') userId: string) {
		return this.planService.getCurrentPlan(userId);
	}

	@Post('generate')
	@ApiOperation({ summary: 'Generate new learning plan (week 1, week 2, or new cycle)' })
	@ApiOkResponse({ description: 'Plan generated successfully' })
	@ApiBadRequestResponse({ description: 'Placement test or survey missing, or review gate not passed' })
	generate(@ReqUser('userId') userId: string, @Body() dto: GeneratePlanDto) {
		return this.planService.generatePlan(userId, dto);
	}

	@Post('review/:itemId/feedback')
	@ApiOperation({ summary: 'Submit feedback for weekly review (unlocks gate for next week)' })
	@ApiOkResponse({ description: 'Feedback submitted, gate unlocked' })
	@ApiNotFoundResponse({ description: 'Review item not found' })
	@ApiBadRequestResponse({ description: 'Not a review item, review not generated, or already submitted' })
	submitReviewFeedback(
		@ReqUser('userId') userId: string,
		@Param('itemId', ParseUUIDPipe) itemId: string,
		@Body() dto: SubmitReviewFeedbackDto,
	) {
		return this.planService.submitReviewFeedback(userId, itemId, dto);
	}

	@Patch('items/:itemId')
	@ApiOperation({ summary: 'Update plan item (complete, skip, or submit custom activity)' })
	@ApiOkResponse({ description: 'Plan item updated' })
	@ApiNotFoundResponse({ description: 'Plan item not found' })
	@ApiBadRequestResponse({ description: 'Item already completed/skipped, or is a weekly_review' })
	updateItem(
		@ReqUser('userId') userId: string,
		@Param('itemId', ParseUUIDPipe) itemId: string,
		@Body() dto: UpdatePlanItemDto,
	) {
		return this.planService.updatePlanItem(userId, itemId, dto);
	}

	@Get('history')
	@ApiOperation({ summary: 'Past plan cycles with summary' })
	@ApiOkResponse({ description: 'Paginated plan history' })
	getHistory(@ReqUser('userId') userId: string, @Query() query: ListPlanHistoryDto) {
		return this.planService.getHistory(userId, query);
	}
}
