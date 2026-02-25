import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListCollocationsDto {
	@ApiPropertyOptional({ enum: ['A1', 'A2', 'B1', 'B2', 'C1'] })
	@IsOptional()
	@IsString()
	cefrLevel?: string;

	@ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(50)
	@Type(() => Number)
	limit?: number = 5;
}
