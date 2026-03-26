import {
	AssessedLevelEnum,
	CertificationType,
	DayOfWeek,
	ExperienceLevelEnum,
	SkillName,
	UsageContextEnum,
} from '@app/shared';
import { PrimaryGoalsEnum } from '@app/shared/enums/primary-goals.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';
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
	ValidateIf,
} from 'class-validator';

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
	@IsEnum(SkillName, { each: true }) // ['reading', 'writing', 'speaking'] hoặc ['all']
	primaryFocusSkills: SkillName[];

	@IsOptional()
	@IsArray()
	@IsEnum(DayOfWeek, { each: true })
	@ApiPropertyOptional({
		enum: DayOfWeek,
		isArray: true,
		example: ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
	})
	availableDays?: DayOfWeek[];

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
	@ValidateIf((o) => o.primaryGoal === 'certification')
	@IsNotEmpty({ message: 'Target certification required when goal is certification' })
	targetCertification?: CertificationType;

	@IsOptional()
	@IsString()
	targetScore?: string; // "7.0", "850"
}
