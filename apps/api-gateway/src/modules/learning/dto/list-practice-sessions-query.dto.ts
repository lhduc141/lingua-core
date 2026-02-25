import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SkillName } from '@prisma/client';
import { PagingDto } from '@app/shared';

export class ListPracticeSessionsDto extends PagingDto {
	@ApiPropertyOptional({ enum: SkillName, description: 'Filter by skill' })
	@IsOptional()
	@IsEnum(SkillName)
	skill?: SkillName;

	@ApiPropertyOptional({
		description: 'Filter by CEFR level',
		example: 'B1',
		enum: ['A1', 'A2', 'B1', 'B2', 'C1'],
	})
	@IsOptional()
	@IsString()
	cefrLevel?: string;
}
