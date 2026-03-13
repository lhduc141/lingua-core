import { HttpStatus } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, ApiPropertyOptions } from '@nestjs/swagger';
import { ClassConstructor, Expose, plainToInstance, Type } from 'class-transformer';
import { messages } from '@app/shared/constants/messages.constant';

export class ResponseDto<T = null> {
	@ApiProperty({ example: HttpStatus.OK })
	@Expose()
	statusCode: number = HttpStatus.OK;

	@ApiProperty({ example: messages.success })
	@Expose()
	message: string = messages.success;

	@ApiProperty()
	@Expose()
	data: T | null = null;

	@ApiPropertyOptional({ type: String, isArray: true })
	@Expose()
	@Type(() => String)
	errors?: string[] | null = null;

	constructor(partial?: Partial<ResponseDto<T>>) {
		Object.assign(this, partial);
	}

	static success<TClass>(
		cls: ClassConstructor<TClass>,
		data: unknown,
		message: string = messages.success,
		statusCode: number = HttpStatus.OK,
	): ResponseDto<TClass> {
		const transformed = data
			? (cls as unknown) === Object
				? (data as TClass)
				: plainToInstance(cls, data as object, {
						excludeExtraneousValues: true,
					})
			: null;

		return new ResponseDto<TClass>({
			statusCode,
			message,
			data: transformed,
		});
	}
}

export function ResponseDtoType<T>(cls: ClassConstructor<T>, options: ApiPropertyOptions = {}): typeof ResponseDto<T> {
	const className = cls === null ? 'ResponseDto' : `Response${cls.name}`;
	const classObj = {
		[className]: class extends ResponseDto<T> {},
	};

	const { prototype } = classObj[className];

	if (cls === null) {
		options.example = null;
	} else {
		options.type = cls;
	}

	ApiProperty(options)(prototype, 'data');
	Type(() => cls)(prototype, 'data');

	return classObj[className];
}

export class ResponseSuccessDto extends ResponseDtoType(Object) {}
