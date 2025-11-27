import { Transform } from 'class-transformer';
import { isArray } from 'class-validator';

const optionalBooleanMapper = new Map([
	['undefined', undefined],
	['null', null],
	['true', true],
	['false', false],
]);

export const TransformBoolean = (props?: { each?: boolean }) =>
	Transform(({ key, obj }) => {
		if (
			obj?.[key] === undefined ||
			obj?.[key] === null ||
			typeof obj?.[key] === 'boolean' ||
			(props?.each && isArray(obj?.[key]) && obj?.[key].some((o) => typeof o === 'boolean'))
		) {
			return obj?.[key];
		}

		return props?.each && isArray(obj?.[key])
			? obj?.[key].map((o) => optionalBooleanMapper.get(o))
			: optionalBooleanMapper.get(obj?.[key]);
	});
