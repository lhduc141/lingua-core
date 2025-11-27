import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class DefaultResponseDto {
	@ApiProperty({ default: HttpStatus.OK })
	@Expose()
	statusCode: HttpStatus = HttpStatus.OK;

	@ApiProperty({ default: 'Success' })
	@Expose()
	message: string = 'Success';
}
