import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class StartPracticeAssessmentDto {
	@ApiProperty({ description: 'UUID của practice session cần làm bài' })
	@IsUUID()
	practiceSessionId: string;
}
