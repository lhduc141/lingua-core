import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListUsersQueryDto {
	@ApiPropertyOptional({
		description: 'Search by email or name',
		example: 'john@example.com',
	})
	@IsOptional()
	@IsString()
	search?: string;

	@ApiPropertyOptional({
		description: 'Filter by active status',
		example: true,
	})
	@IsOptional()
	@IsBoolean()
	@Transform(({ value }) => value === 'true')
	isActive?: boolean;

	@ApiPropertyOptional({
		description: 'Filter by admin status',
		example: false,
	})
	@IsOptional()
	@IsBoolean()
	@Transform(({ value }) => value === 'true')
	isAdmin?: boolean;

	@ApiPropertyOptional({
		description: 'Page size',
		example: 50,
		default: 50,
		minimum: 1,
		maximum: 100,
	})
	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(100)
	@Type(() => Number)
	limit?: number = 50;

	@ApiPropertyOptional({
		description: 'Number of items to skip',
		example: 0,
		default: 0,
	})
	@IsOptional()
	@IsInt()
	@Min(0)
	@Type(() => Number)
	offset?: number = 0;
}
