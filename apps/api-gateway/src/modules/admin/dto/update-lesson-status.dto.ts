import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class UpdateLessonStatusDto {
	@ApiProperty({ enum: ['published', 'draft'] })
	@IsEnum({ enum: ['published', 'draft'] })
	status: 'published' | 'draft';
}
