import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class ProfileMeDto {
	@IsOptional()
	@IsString()
	userId: string;

	@IsOptional()
	@IsEmail()
	email?: string;

	@IsOptional()
	@IsBoolean()
	isAdmin?: boolean;
}
