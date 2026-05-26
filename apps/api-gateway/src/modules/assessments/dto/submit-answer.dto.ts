import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsObject, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

export class AnswerPayloadDto {
	@ApiPropertyOptional({ description: 'optionId — dùng cho mcq_single' })
	@IsOptional()
	@IsUUID()
	optionId?: string;

	@ApiPropertyOptional({ description: 'optionIds — dùng cho mcq_multi', type: [String] })
	@IsOptional()
	@IsUUID('4', { each: true })
	optionIds?: string[];

	@ApiPropertyOptional({ description: 'textAnswer — dùng cho essay / speaking / fill_blank' })
	@IsOptional()
	@IsString()
	textAnswer?: string;

	@ApiPropertyOptional({ description: 'pronunciationScores — từ Azure Speech SDK, speaking only' })
	@IsOptional()
	@IsObject()
	pronunciationScores?: Record<string, any> | null;
}

export class SubmitAnswerDto {
	@ApiProperty({ description: 'UUID của câu hỏi đang trả lời' })
	@IsUUID()
	questionId: string;

	@ApiProperty({ description: 'Đáp án của user', type: AnswerPayloadDto })
	@ValidateNested()
	@Type(() => AnswerPayloadDto)
	answer: AnswerPayloadDto;
}
