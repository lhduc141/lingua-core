import { Body, Controller, Get, Post } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { ReqUser } from '../../decorators/req-user.decorator';
import type { JwtPayloadDto } from '@app/jwt';
import { UpsertOnboardingSurveyDto } from './dto/upsert-onboarding-survey.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Onboarding')
@Controller('onboarding')
export class OnboardingController {
	constructor(private readonly onboardingService: OnboardingService) {}

	@Post('survey')
	async postSurvey(@ReqUser() user: JwtPayloadDto, @Body() onboardSurveyDto: UpsertOnboardingSurveyDto) {
		return this.onboardingService.upsertSurvey(user, onboardSurveyDto);
	}

	@Get('survey/me')
	async getSurvey(@ReqUser() user: JwtPayloadDto) {
		return this.onboardingService.getSurvey(user.userId);
	}
}
