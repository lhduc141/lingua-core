import { HttpException, HttpStatus } from '@nestjs/common';
import { messages } from '../constants';
import { ResponseDto } from '../dto';

export class UnauthorizedException extends HttpException {
	constructor(error?: string) {
		super(
			new ResponseDto({
				statusCode: HttpStatus.UNAUTHORIZED,
				message: error ?? messages.unauthorized,
			}),
			HttpStatus.UNAUTHORIZED,
		);
	}
}
