import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SkillName } from '@prisma/client';
import { CefrLevel, PagingDto } from '@app/shared';

export class ListLessonsDto extends PagingDto {
	@ApiPropertyOptional({ enum: SkillName })
	@IsOptional()
	@IsEnum(SkillName)
	skill?: SkillName;

	@ApiPropertyOptional({ enum: CefrLevel })
	@IsOptional()
	@IsString()
	cefrLevel?: CefrLevel;
}
