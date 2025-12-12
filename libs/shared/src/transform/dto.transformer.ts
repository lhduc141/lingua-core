import { plainToInstance } from 'class-transformer';

export function toDto<T>(cls: new (...args: any[]) => T, data: any): T | null {
	if (!data) return null;

	return plainToInstance(cls, data, {
		excludeExtraneousValues: true,
	});
}
