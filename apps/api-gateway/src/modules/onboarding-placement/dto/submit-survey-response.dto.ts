import { ApiProperty } from '@nestjs/swagger';

export class SurveyBasicInfoDto {
	@ApiProperty()
	primaryGoal: string;

	@ApiProperty()
	plannedStudyHoursPerWeek: number;

	@ApiProperty()
	primaryFocusSkills: string[];
}

export class SubmitSurveyResponseDto {
	surveyId: string;
	completedAt: Date;
	isUpdate: boolean;
	message: string;
	survey: SurveyBasicInfoDto;
}
