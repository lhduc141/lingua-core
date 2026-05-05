import { PagingDto } from '@app/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SkillName } from '@app/shared';

export class ListAdminLessonsDto extends PagingDto {
	@ApiPropertyOptional({ enum: SkillName })
	@IsOptional()
	@IsEnum(SkillName)
	skill?: SkillName;

	@ApiPropertyOptional({ enum: ['A1', 'A2', 'B1', 'B2', 'C1'] })
	@IsOptional()
	@IsString()
	cefrLevel?: string;

	@ApiPropertyOptional({ enum: ['draft', 'published', 'archived'] })
	@IsOptional()
	@IsString()
	status?: string;
}
