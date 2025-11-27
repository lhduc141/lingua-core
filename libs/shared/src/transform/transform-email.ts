import { Transform } from 'class-transformer';

export const TransformEmail = () =>
	Transform(({ value }: { value?: string }) => (!value ? value : value.toLowerCase().trim()));

export const TransformEmails = () =>
	Transform(({ value }: { value?: string[] }) => (!value ? value : value?.map((v) => v?.toLowerCase().trim())));

export function transformEmail(value: string): string {
	return value.toLowerCase().trim();
}
