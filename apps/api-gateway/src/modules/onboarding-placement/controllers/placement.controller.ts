import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
	ApiBearerAuth,
	ApiConflictResponse,
	ApiCreatedResponse,
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiOperation,
	ApiTags,
} from '@nestjs/swagger';
import type { JwtPayloadDto } from '@app/jwt';
import { ReqUser } from 'apps/api-gateway/src/decorators/req-user.decorator';
import { AuthGuard } from '../../../guards/auth.guard';
import { PlacementService } from '../services/placement.service';
import { SubmitPlacementAnswerDto } from '../dto/submit-placement-answer.dto';

/**
 * PlacementController
 *
 * Handles the 4 placement test APIs.
 * All routes require JWT authentication (AuthGuard).
 *
 * Typical client flow:
 *   1. POST /start          → receive assessmentId + firstQuestion
 *   2. POST /answer (×N)   → send answer, receive nextQuestion
 *   3. (auto-finish when isCompleted=true)
 *      OR POST /complete    → manual finish (>= minQuestions required)
 *   4. GET  /result         → retrieve result anytime after completion
 */
@ApiTags('Placement Test')
@Controller('placement')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class PlacementController {
	constructor(private readonly placementService: PlacementService) {}

	@Post('start')
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({ summary: 'Start a new placement test' })
	@ApiCreatedResponse({ description: 'Test started successfully, first question returned.' })
	@ApiConflictResponse({ description: 'User already has an in-progress placement test.' })
	async startPlacementTest(@ReqUser() user: JwtPayloadDto) {
		return this.placementService.startPlacementTest(user.userId);
	}

	@Post('answers')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Submit an answer and receive the next question' })
	@ApiOkResponse({ description: 'Answer processed. Contains nextQuestion or result.' })
	@ApiNotFoundResponse({ description: 'Assessment, session, or question not found.' })
	async submitAnswer(@ReqUser() user: JwtPayloadDto, @Body() dto: SubmitPlacementAnswerDto) {
		return this.placementService.submitAnswer(user.userId, dto);
	}

	@Post('complete')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Manually complete the placement test' })
	@ApiOkResponse({ description: 'Test completed. Final CEFR result returned.' })
	@ApiNotFoundResponse({ description: 'No active placement test found.' })
	async completePlacementTest(@ReqUser() user: JwtPayloadDto) {
		return this.placementService.completePlacementTest(user.userId);
	}

	@Get('result')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Get the most recent completed placement test result' })
	@ApiOkResponse({ description: 'Placement test result returned.' })
	@ApiNotFoundResponse({ description: 'No completed placement test found.' })
	async getPlacementResult(@ReqUser() user: JwtPayloadDto) {
		return this.placementService.getPlacementResult(user.userId);
	}
}
