import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClassConstructor, Expose, Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, DEFAULT_SKIP } from '../constants';

export class PagingDto {
	@ApiPropertyOptional({ default: DEFAULT_PAGE_INDEX, minimum: 1 })
	@Transform(({ value }) => Number(value))
	@IsOptional()
	@IsInt()
	@Min(1)
	readonly pageIndex: number = DEFAULT_PAGE_INDEX;

	@ApiPropertyOptional({ default: DEFAULT_PAGE_SIZE, minimum: 1 })
	@Transform(({ value }) => Number(value))
	@IsOptional()
	@IsInt()
	@Min(1)
	readonly pageSize: number = DEFAULT_PAGE_SIZE;
}

export class PagingV2Dto {
	@ApiPropertyOptional({ default: DEFAULT_SKIP, minimum: 0 })
	@IsOptional()
	@IsInt()
	@Min(0)
	readonly skip?: number = DEFAULT_SKIP;

	@ApiPropertyOptional({ default: DEFAULT_PAGE_SIZE, minimum: 1 })
	@IsOptional()
	@IsInt()
	@Min(1)
	readonly limit?: number = DEFAULT_PAGE_SIZE;
}

export class PagingDataDto<T> {
	constructor(partial?: PagingDataDto<T>) {
		Object.assign(this, partial);
	}

	@ApiProperty()
	@Expose()
	count: number;

	@ApiProperty({ isArray: true })
	@Expose()
	rows: T[];
}

export function PagingDataDtoType<T>(cls: ClassConstructor<T>): typeof PagingDataDto<T> {

	const className = `Paging${cls.name}`;
	const classObj = {
		[className]: class extends PagingDataDto<T> {},
	};

	const { prototype } = classObj[className];

	ApiProperty({ type: cls, isArray: true })(prototype, 'rows');
	Type(() => cls)(prototype, 'rows');

	return classObj[className];
}
