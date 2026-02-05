// onboarding.dto.ts
import { IsArray, IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertOnboardingSurveyDto {
	@IsOptional()
	@IsString()
	targetGoal?: string;

	@IsOptional()
	@IsDateString()
	targetDeadlineDate?: string;

	@IsOptional()
	@IsNumber()
	plannedStudyHoursPerWeek?: number;

	@IsOptional()
	@IsArray()
	primaryFocusSkills?: string[];

	@IsOptional()
	@IsString()
	selfAssessedLevel?: string;

	@IsOptional()
	@IsString()
	usageContext?: string;

	@IsOptional()
	@IsArray()
	difficulties?: string[];

	@IsOptional()
	metaJson?: any;

	@IsOptional()
	answers?: {
		key: string;
		value: any;
		order?: number;
	}[];
}
