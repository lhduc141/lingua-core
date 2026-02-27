import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitReviewFeedbackDto {
	@ApiPropertyOptional({ description: 'User feedback on the weekly review (can be null to skip)' })
	@IsOptional()
	@IsString()
	@MaxLength(2000)
	userFeedback?: string | null;
}
