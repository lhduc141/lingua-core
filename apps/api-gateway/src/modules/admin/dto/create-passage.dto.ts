import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { CefrLevel } from '@app/shared';

export class CreatePassageDto {
	@ApiProperty({ description: 'Tiêu đề của passage' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(200)
	@Expose()
	title: string;

	@ApiProperty({ description: 'Nội dung văn bản của passage' })
	@IsString()
	@IsNotEmpty()
	@Expose()
	content: string; // Text content

	@ApiPropertyOptional({ description: 'Số từ trong passage', minimum: 1 })
	@IsOptional()
	@IsInt()
	@Min(1)
	wordCount?: number;

	@ApiPropertyOptional({
		description: 'Trình độ CEFR',
		enum: CefrLevel,
	})
	@IsOptional()
	@IsString()
	@IsEnum(CefrLevel)
	cefrLevel?: string;

	@ApiPropertyOptional({
		description: 'Chủ đề của passage',
		maxLength: 100,
	})
	@IsOptional()
	@IsString()
	@MaxLength(100)
	topic?: string;

	@ApiPropertyOptional({
		description: 'Nguồn của passage',
		maxLength: 100,
	})
	@IsOptional()
	@IsString()
	@MaxLength(100)
	sourceTag?: string;
}
