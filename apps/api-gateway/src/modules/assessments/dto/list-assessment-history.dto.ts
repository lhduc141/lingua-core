import { PagingDto } from '@app/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { SkillName } from '@app/shared';

export class ListAssessmentHistoryDto extends PagingDto {
	@ApiPropertyOptional({ enum: ['lesson', 'question_set'] })
	@IsOptional()
	@IsEnum(['lesson', 'question_set'])
	refType?: string;

	@ApiPropertyOptional({ enum: SkillName })
	@IsOptional()
	@IsEnum(SkillName)
	skillName?: SkillName;
}
