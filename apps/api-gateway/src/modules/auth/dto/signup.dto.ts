import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SignupDto {
	@IsEmail()
	@IsNotEmpty()
	email: string;

	@IsOptional()
	@IsString()
	name?: string;

	@IsString()
	@IsNotEmpty()
	idToken: string;
}
