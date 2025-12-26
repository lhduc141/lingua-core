import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkImportDictionaryDto {
	@ApiProperty({
		enum: ['csv', 'json'],
		example: 'json',
		description: 'Format của file import',
	})
	@IsEnum(['csv', 'json'])
	format: 'csv' | 'json';

	@ApiProperty({
		description: 'Base64 encoded file content',
		example: 'W3siaGVhZHdvcmQiOiJydW4iLC4uLn1d',
	})
	@IsString()
	@IsNotEmpty()
	data: string;
}
