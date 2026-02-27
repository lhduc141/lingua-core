import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class GeneratePlanDto {
	@ApiPropertyOptional({
		description: 'Phase to generate. null = auto-detect (new cycle or next week)',
		enum: ['week1', 'week2'],
	})
	@IsOptional()
	@IsIn(['week1', 'week2'])
	phase?: 'week1' | 'week2';
}
