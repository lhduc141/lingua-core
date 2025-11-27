import { Transform } from 'class-transformer';

export const TransformObjectId = () =>
	Transform(({ key, obj }) => {
		const value = obj?.[key];

		return value?.toString();
	});
