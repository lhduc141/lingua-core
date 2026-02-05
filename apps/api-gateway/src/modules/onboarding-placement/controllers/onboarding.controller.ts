import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import type { JwtPayloadDto } from '@app/jwt';
import { ApiTags } from '@nestjs/swagger';
import { ReqUser } from 'apps/api-gateway/src/decorators/req-user.decorator';
import { OnboardingService } from '../services/onboarding.service';
import { SubmitSurveyDto } from '../dto/submit-survey.dto';
import { AuthGuard } from '../../../guards/auth.guard';

@Controller('onboarding')
@UseGuards(AuthGuard)
@ApiTags('Onboarding')
export class OnboardingController {
	constructor(private readonly onboardingService: OnboardingService) {}

	@Get('survey')
	async getSurvey(@ReqUser() user: JwtPayloadDto) {
		return this.onboardingService.getSurvey(user.userId);
	}

	@Post('survey')
	@HttpCode(HttpStatus.CREATED)
	async postSurvey(@ReqUser() user: JwtPayloadDto, @Body() survey: SubmitSurveyDto) {
		return this.onboardingService.submitSurvey(user, survey);
	}
}
