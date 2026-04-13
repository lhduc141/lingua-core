import { PagingDto } from '@app/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ListPlacementSessionsDto extends PagingDto {
	@ApiPropertyOptional({ enum: ['A1', 'A2', 'B1', 'B2', 'C1'] })
	@IsOptional()
	@IsString()
	cefrLevel?: string;

	@ApiPropertyOptional({ enum: ['in_progress', 'completed'] })
	@IsOptional()
	@IsEnum(['in_progress', 'completed'])
	status?: string;
}
