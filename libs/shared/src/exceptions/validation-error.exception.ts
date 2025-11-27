import { BadRequestException, HttpStatus, ValidationError } from '@nestjs/common';
import { messages } from '../constants';
import { ResponseDto } from '../dto';
import { getAllConstraints } from '../helpers';

export class ValidationErrorException extends BadRequestException {
	constructor(errors?: ValidationError[] | string) {
		super(
			new ResponseDto({
				statusCode: HttpStatus.BAD_REQUEST,
				message: messages.validationError,
				errors: typeof errors === 'string' ? [errors] : getAllConstraints(errors ?? []),
			}),
		);
	}
}
