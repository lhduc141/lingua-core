import {
	ArrayMinSize,
	IsArray,
	IsBoolean,
	IsEnum,
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	IsUUID,
	MaxLength,
	Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SkillName } from '@app/shared';

export class CreateQuestionSetDto {
	@ApiProperty({
		description: 'Skill name',
		enum: SkillName,
	})
	@IsEnum(SkillName)
	skillName: SkillName;

	@ApiProperty({
		description: 'Tiêu đề practice session',
		example: 'IELTS Writing Task 2 Practice',
	})
	@IsString()
	@IsNotEmpty()
	@MaxLength(200)
	title: string;

	@ApiPropertyOptional({
		description: 'Mô tả',
		example: 'Practice IELTS Writing Task 2 essays',
	})
	@IsOptional()
	@IsString()
	description?: string;

	@ApiProperty({
		description: 'Array of question UUIDs',
		example: ['q-uuid-1', 'q-uuid-2'],
	})
	@IsArray()
	@ArrayMinSize(1)
	@IsUUID('4', { each: true })
	questionIds: string[];

	@ApiPropertyOptional({
		enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
		example: 'B2',
	})
	@IsOptional()
	@IsString()
	@IsEnum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
	cefrLevel?: string;

	@ApiPropertyOptional({
		description: 'Thời gian ước tính (phút)',
		example: 45,
	})
	@IsOptional()
	@IsInt()
	@Min(1)
	estimatedMinutes?: number;

	@ApiPropertyOptional({
		example: true,
		default: true,
	})
	@IsOptional()
	@IsBoolean()
	isActive?: boolean;
}
