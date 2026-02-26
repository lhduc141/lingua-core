import { PagingDto } from '@app/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { SkillName } from '@prisma/client';

export class ListAssessmentHistoryDto extends PagingDto {
	@ApiPropertyOptional({ enum: ['lesson', 'practice_session'] })
	@IsOptional()
	@IsEnum(['lesson', 'practice_session'])
	refType?: string;

	@ApiPropertyOptional({ enum: SkillName })
	@IsOptional()
	@IsEnum(SkillName)
	skillName?: SkillName;
}
