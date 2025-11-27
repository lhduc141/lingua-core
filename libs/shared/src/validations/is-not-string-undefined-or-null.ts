import { ValidationOptions, registerDecorator } from 'class-validator';

export function IsNotStringUndefinedOrNull(validationOptions?: ValidationOptions) {
	return function (object: Object, propertyName: string) {
		registerDecorator({
			name: 'isNotStringUndefinedOrNull',
			target: object.constructor,
			propertyName: propertyName,
			options: validationOptions,
			validator: {
				validate(value: any) {
					return value !== 'undefined' && value !== 'null';
				},
				defaultMessage() {
					return `${propertyName} không được là \"undefined\" hoặc \"null\"`;
				},
			},
		});
	};
}
