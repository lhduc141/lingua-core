export class CheckCodeExistDto {
	readonly code?: string;

	readonly checkExist: () => Promise<any>;
}
