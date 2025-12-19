import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleAuthDto {
	@IsString()
	@IsNotEmpty()
	idToken: string;
}
