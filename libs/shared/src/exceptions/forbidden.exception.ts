import { HttpException, HttpStatus } from '@nestjs/common';
import { messages } from '../constants';
import { ResponseDto } from '../dto';

export class ForbiddenException extends HttpException {
	constructor(error?: string) {
		super(
			new ResponseDto({
				statusCode: HttpStatus.FORBIDDEN,
				message: error ?? messages.forbidden,
			}),
			HttpStatus.FORBIDDEN,
		);
	}
}
