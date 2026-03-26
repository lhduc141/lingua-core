import type { JwtPayloadDto } from '@app/jwt';
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
import { ReqUser } from 'apps/api-gateway/src/decorators/req-user.decorator';
import { AuthGuard } from '../../../guards/auth.guard';
import { SubmitPlacementAnswerDto } from '../dto/submit-placement-answer.dto';
import { PlacementService } from '../services/placement.service';

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

	@Post('skip')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Skip the placement test' })
	@ApiOkResponse({ description: 'Placement test skipped.' })
	async skipPlacementTest(@ReqUser() user: JwtPayloadDto) {
		return this.placementService.skipPlacementTest(user.userId);
  }
	
  @Get('current')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get the current placement test session" })
  @ApiOkResponse({ description: 'Current session returned with next question' })
  @ApiNotFoundResponse({ description: 'No in-progress placement session test found' })
  async getCurrentSession(@ReqUser() user: JwtPayloadDto) {
    return this.placementService.getCurrentSession(user.userId)
  }
}
