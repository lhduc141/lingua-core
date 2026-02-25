import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LookupWordDto {
	@ApiProperty({ description: 'Từ cần tra', example: 'happiness' })
	@IsNotEmpty()
	@IsString()
	@MaxLength(100)
	@Transform(({ value }) => value?.toLowerCase().trim())
	word: string;
}
