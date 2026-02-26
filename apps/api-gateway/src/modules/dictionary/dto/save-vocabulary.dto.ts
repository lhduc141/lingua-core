import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SaveVocabularyDto {
	@ApiProperty({ description: 'ID của từ trong dictionary' })
	@IsNotEmpty()
	@IsUUID()
	entryId: string;

	@ApiPropertyOptional({ description: 'Ghi chú cá nhân', maxLength: 500 })
	@IsOptional()
	@IsString()
	@MaxLength(500)
	note?: string;

	@ApiPropertyOptional({ description: 'Ngữ cảnh gặp từ (bài học, passage...)', maxLength: 200 })
	@IsOptional()
	@IsString()
	@MaxLength(200)
	context?: string;
}
