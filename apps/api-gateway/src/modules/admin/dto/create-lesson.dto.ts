import {
	IsArray,
	IsEnum,
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	IsUUID,
	MaxLength,
	Min,
	ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SkillName } from '@prisma/client';

export class TheorySectionDto {
	@ApiProperty({
		enum: ['rule', 'example', 'tip'],
		example: 'rule',
	})
	@IsEnum(['rule', 'example', 'tip'])
	type: 'rule' | 'example' | 'tip';

	@ApiProperty({
		example: 'Present Simple is used for habits and facts',
	})
	@IsString()
	@IsNotEmpty()
	content: string;
}

// ==========================================
// MAIN DTO
// ==========================================

export class CreateLessonDto {
	@ApiProperty({
		description: 'Skill name',
		enum: SkillName,
	})
	@IsEnum(SkillName)
	skillName: SkillName;

	@ApiProperty({
		description: 'Tiêu đề bài học',
		example: 'Understanding Main Ideas',
	})
	@IsString()
	@IsNotEmpty()
	@MaxLength(200)
	title: string;

	@ApiPropertyOptional({
		description: 'Mô tả bài học',
		example: 'Learn to identify main ideas in reading passages',
	})
	@IsOptional()
	@IsString()
	description?: string;

	@ApiPropertyOptional({
		description: 'Theory sections (30% of lesson)',
		type: [TheorySectionDto],
	})
	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => TheorySectionDto)
	theoryContent?: TheorySectionDto[];

	@ApiPropertyOptional({
		enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
		example: 'B1',
	})
	@IsOptional()
	@IsString()
	@IsEnum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
	cefrLevel?: string;

	@ApiPropertyOptional({
		description: 'Thời gian ước tính (phút)',
		example: 30,
	})
	@IsOptional()
	@IsInt()
	@Min(1)
	estimatedMinutes?: number;

	@ApiPropertyOptional({
		description: 'Array of prerequisite lesson UUIDs',
		example: ['uuid1', 'uuid2'],
	})
	@IsOptional()
	@IsArray()
	@IsUUID('4', { each: true })
	prerequisites?: string[];

	@ApiPropertyOptional({
		description: 'Array of question UUIDs (70% practice)',
		example: ['q-uuid1', 'q-uuid2'],
	})
	@IsOptional()
	@IsArray()
	@IsUUID('4', { each: true })
	questionIds?: string[];

	@ApiPropertyOptional({
		enum: ['draft', 'reviewed', 'published', 'archived'],
		default: 'draft',
	})
	@IsOptional()
	@IsEnum(['draft', 'reviewed', 'published', 'archived'])
	status?: string;
}
