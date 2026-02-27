import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePlanItemDto {
	@ApiProperty({ enum: ['completed', 'skipped'], description: 'New status' })
	@IsIn(['completed', 'skipped'])
	status: 'completed' | 'skipped';

	@ApiPropertyOptional({ description: 'User submission text (for custom_activity)' })
	@IsOptional()
	@IsString()
	@MaxLength(5000)
	submittedText?: string;
}
