// apps/api/src/modules/auth/dto/update-profile-onboarding.dto.ts
import { IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateProfileOnboardingDto {
	@IsOptional()
	@IsIn(['ielts', 'toeic', 'communication', 'study_abroad', 'other'])
	goalType?: string;

	@IsOptional()
	@IsString()
	goalDetail?: string;

	@IsOptional()
	@IsIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'not_sure'])
	selfCefr?: string;

	@IsOptional()
	@IsDateString()
	targetDate?: string;

	@IsOptional()
	@IsInt()
	studyMinutesPerWeek?: number;

	@IsOptional()
	@IsArray()
	focusSkills?: string[]; // ['listening','speaking',...]
}
