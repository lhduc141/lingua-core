import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class StartQuestionSetAssessmentDto {
	@ApiProperty({ description: 'UUID của question set cần làm bài' })
	@IsUUID()
	questionSetId: string;
}
