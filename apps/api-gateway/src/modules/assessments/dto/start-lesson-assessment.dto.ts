import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class StartLessonAssessmentDto {
	@ApiProperty({ description: 'UUID của lesson cần làm bài' })
	@IsUUID()
	lessonId: string;
}
