// apps/api/src/modules/auth/dto/update-profile.dto.ts
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
	@IsOptional()
	@IsString()
	fullName?: string;

	@IsOptional()
	@IsDateString()
	dob?: string;

	@IsOptional()
	@IsString()
	gender?: string;

	@IsOptional()
	@IsString()
	phone?: string;
}
