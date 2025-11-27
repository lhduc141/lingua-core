import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsValidDate(validationOptions?: ValidationOptions) {
	return function (object: Object, propertyName: string) {
		registerDecorator({
			name: 'isValidDate',
			target: object.constructor,
			propertyName: propertyName,
			options: validationOptions,
			validator: {
				validate(value: any, args: ValidationArguments) {
					if (typeof value !== 'string') return false;
					const [day, month, year] = value.split('/').map(Number);
					if (!day || !month || !year) return false;
					const date = new Date(year, month - 1, day);
					return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
				},
				defaultMessage(args: ValidationArguments) {
					return `${args.property} không hợp lệ. Định dạng phải là dd/mm/yyyy và phải là ngày hợp lệ. Giá trị hiện tại: ${args.value}`;
				},
			},
		});
	};
}
