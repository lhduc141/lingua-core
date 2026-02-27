import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class GetStudyTimeDto {
	@ApiPropertyOptional({ enum: ['week', 'month', 'all'], default: 'week' })
	@IsOptional()
	@IsIn(['week', 'month', 'all'])
	period?: 'week' | 'month' | 'all' = 'week';
}
