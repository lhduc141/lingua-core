import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import type { JwtPayloadDto } from '@app/jwt';
import {
	ApiBearerAuth,
	ApiCreatedResponse,
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiOperation,
	ApiTags,
} from '@nestjs/swagger';
import { ReqUser } from 'apps/api-gateway/src/decorators/req-user.decorator';
import { AuthGuard } from '../../../guards/auth.guard';
import { OnboardingService } from '../services/onboarding.service';
import { SubmitSurveyDto } from '../dto/submit-survey.dto';

@ApiTags('Onboarding')
@Controller('onboarding')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class OnboardingController {
	constructor(private readonly onboardingService: OnboardingService) {}

	@Get('survey')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Get the current active survey' })
	@ApiOkResponse({ description: 'Active survey returned.' })
	@ApiNotFoundResponse({ description: 'No active survey found.' })
	async getSurvey(@ReqUser() user: JwtPayloadDto) {
		return this.onboardingService.getSurvey(user.userId);
	}

	@Post('survey')
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({ summary: 'Submit or update the onboarding survey' })
	@ApiCreatedResponse({ description: 'Survey submitted successfully.' })
	async submitSurvey(@ReqUser() user: JwtPayloadDto, @Body() dto: SubmitSurveyDto) {
		return this.onboardingService.submitSurvey(user, dto);
	}

	@Get('survey/history')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Get survey version history' })
	@ApiOkResponse({ description: 'Survey history returned.' })
	@ApiNotFoundResponse({ description: 'No survey history found.' })
	async getSurveyHistory(@ReqUser() user: JwtPayloadDto) {
		return this.onboardingService.getSurveyHistory(user.userId);
	}

	@Post('skip')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Skip both onboarding survey and placement test' })
	async skipSurvey(@ReqUser() user: JwtPayloadDto) {
		return await this.onboardingService.skipSurvey(user.userId);
	}
}
