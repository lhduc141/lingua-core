import { HttpException, HttpStatus } from '@nestjs/common';
import { messages } from '../constants';
import { ResponseDto } from '../dto';

export class BadRequestException extends HttpException {
	constructor(error?: string) {
		super(
			new ResponseDto({
				statusCode: HttpStatus.BAD_REQUEST,
				message: error ?? messages.badRequest,
			}),
			HttpStatus.BAD_REQUEST,
		);
	}
}
