import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class SubmitPlacementAnswerDto {
	@ApiProperty({ description: 'Assessment ID returned from POST /placement/test/start' })
	@IsNotEmpty()
	@IsUUID()
	assessmentId: string;

	@ApiProperty({ description: 'The question being answered' })
	@IsNotEmpty()
	@IsUUID()
	questionId: string;

	@ApiProperty({ description: 'The selected option for this question' })
	@IsNotEmpty()
	@IsUUID()
	selectedOptionId: string;
}
