export class CreateUserDto {
	googleSub: string;
	email: string;
	googleName?: string | null;
	googleAvatarUrl?: string | null;
}
