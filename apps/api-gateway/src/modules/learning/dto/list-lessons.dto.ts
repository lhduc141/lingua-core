import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SkillName } from '@app/shared';
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
