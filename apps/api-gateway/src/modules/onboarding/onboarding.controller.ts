import { Body, Controller, Get, Post } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { ReqUser } from '../../decorators/req-user.decorator';
import type { JwtPayloadDto } from '@app/jwt';
import { UpsertOnboardingSurveyDto } from './dto/upsert-onboarding-survey.dto';
import { Public } from '../../decorators/public.decorator';

@Controller('onboarding')
export class OnboardingController {
	constructor(private readonly onboardingService: OnboardingService) {}

	@Public()
	@Post('survey')
	async postSurvey(@ReqUser() user: JwtPayloadDto, @Body() onboardSurveyDto: UpsertOnboardingSurveyDto) {
		return;
	}

	@Get('survey/me')
	async getSurvey(@ReqUser() user: JwtPayloadDto) {
		return this.onboardingService.getSurvey(user.userId);
	}
}
