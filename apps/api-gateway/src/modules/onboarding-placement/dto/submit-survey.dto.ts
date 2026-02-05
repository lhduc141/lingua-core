import {
	ArrayNotEmpty,
	IsArray,
	IsDateString,
	IsEnum,
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	Max,
	MaxLength,
	Min,
} from 'class-validator';
import { PrimaryGoalsEnum } from '@app/shared/enums/primary-goals.enum';
import { AssessedLevelEnum, CertificationType, ExperienceLevelEnum, SkillName, UsageContextEnum } from '@app/shared';
import { AllowNull } from 'sequelize-typescript';

export class SubmitSurveyDto {
	// TIER 1: REQUIRED - AI cần
	@IsNotEmpty()
	@IsEnum(PrimaryGoalsEnum)
	primaryGoal: PrimaryGoalsEnum;

	@IsInt()
	@Min(1)
	@Max(168)
	plannedStudyHoursPerWeek: number;

	@IsArray()
	@ArrayNotEmpty()
	@IsEnum(SkillName) // ['reading', 'writing', 'speaking'] hoặc ['all']
	primaryFocusSkills: SkillName[];

	// TIER 2: IMPORTANT (Personalization)
	@IsOptional()
	@IsDateString()
	targetDeadlineDate?: string;

	@IsOptional()
	@IsString()
	targetGoal?: string;

	@IsOptional()
	@IsEnum(AssessedLevelEnum)
	selfAssessedLevel?: AssessedLevelEnum;

	@IsOptional()
	@IsEnum(UsageContextEnum)
	usageContext?: UsageContextEnum;

	@IsOptional()
	@IsArray()
	@AllowNull
	difficulties?: string[]; // ['listening', 'grammar', 'vocabulary']

	// TIER 3: OPTIONAL (Context thêm)
	@IsOptional()
	@IsString()
	@MaxLength(500)
	additionalContext?: string;

	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(20)
	yearsStudied?: number;

	@IsOptional()
	@IsEnum(ExperienceLevelEnum)
	previousLearningExperience?: ExperienceLevelEnum;

	// CERTIFICATION-SPECIFIC (Conditional)
	@IsOptional()
	@IsEnum(CertificationType)
	targetCertification?: CertificationType;

	@IsOptional()
	@IsString()
	targetScore?: string; // "7.0", "850"
}
