import { HttpException, HttpStatus } from '@nestjs/common';
import { messages } from '../constants';
import { ResponseDto } from '../dto';

export class NotFoundException extends HttpException {
	constructor(error?: string) {
		super(
			new ResponseDto({
				statusCode: HttpStatus.NOT_FOUND,
				message: error ?? messages.notFound,
			}),
			HttpStatus.NOT_FOUND,
		);
	}
}
