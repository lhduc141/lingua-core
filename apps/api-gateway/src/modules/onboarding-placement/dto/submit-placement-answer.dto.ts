import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class SubmitPlacementAnswerDto {
	@ApiProperty({ description: 'Exercise record ID returned from POST /placement/start' })
	@IsNotEmpty()
	@IsUUID()
	exerciseRecordId: string;

	@ApiProperty({ description: 'The question being answered' })
	@IsNotEmpty()
	@IsUUID()
	questionId: string;

	@ApiProperty({ description: 'The selected option for this question' })
	@IsNotEmpty()
	@IsUUID()
	selectedOptionId: string;
}
