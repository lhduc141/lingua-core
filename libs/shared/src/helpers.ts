import { ValidationError } from '@nestjs/common';

export function getAllConstraints(errors: ValidationError[]): string[] {
	const constraints: string[] = [];

	for (const error of errors) {
		if (error.constraints) {
			const constraintValues = Object.values(error.constraints);
			constraints.push(...constraintValues);
		}

		if (error.children) {
			const childConstraints = getAllConstraints(error.children);
			constraints.push(...childConstraints);
		}
	}

	return constraints;
}

export function randomString(length = 12): string {
	let result = '';
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const charactersLength = characters.length;
	let counter = 0;
	while (counter < length) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
		counter += 1;
	}
	return result;
}

export function removeSpecialChars(text?: string): string {
	if (!text) return '';
	return text
		.toLowerCase()
		.replace(/đ/g, 'd')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]/g, ' ')
		.replace(/\s+/g, '') // <- 1 backslash thôi
		.trim();
}

export function generateNumberCode(length: number): string {
	return Math.floor(Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1)).toString();
}

export function formatNumber(number: number, locale?: string): string {
	return new Intl.NumberFormat(locale ?? 'en-US').format(number);
}


// export function generateOtpCode(length = 6): string {
// 	if (process.env.OTP_ENABLED === 'true') {
// 		return generateNumberCode(length);
// 	}
// 	return '1'.repeat(length);
// }


// export function encrypt(data: string): { encrypted: string; salt: string } {
// 	const salt = randomString(20);
// 	const encrypted = CryptoJS.AES.encrypt(data, salt).toString();
//
// 	return { encrypted: encrypted, salt: salt };
// }

// export function compareEncryptedData(data: string, encrypted: string, secretKey: string): boolean {
// 	return data === decrypt(encrypted, secretKey);
// }
//
// export function decrypt(encrypted: string, secretKey: string): string {
// 	return CryptoJS.AES.decrypt(encrypted, secretKey).toString(CryptoJS.enc.Utf8);
// }

// export function paddingChar(value: number | string, length: number, padChar = '0'): string {
// 	return value.toString().padStart(length, padChar);
// }

// export function removeSpecialChars(text?: string): string {
// 	if (!text || typeof text !== 'string') {
// 		return '';
// 	}
//
// 	return text
// 		.toLowerCase()
// 		.replace('đ', 'd')
// 		.normalize('NFD')
// 		.replace(/[\u0300-\u036f]/g, '')
// 		.replace(/[^a-zA-Z0-9]/g, ' ')
// 		.replace(/\\s+/g, '')
// 		.trim();
// }

// export function getValues<T = any>(data: any, columnKeys: string[], distinct = true): T[] {
// 	const values = [];
//
// 	if (!Array.isArray(data)) {
// 		data = [data];
// 	}
//
// 	for (const row of data) {
// 		for (const columnKey of columnKeys) {
// 			const subKey = columnKey.split('.$.');
//
// 			if (subKey.length > 1) {
// 				const subRow = _.get(row, subKey[0]);
// 				values.push(...getValues(subRow, [subKey.slice(1).join('.$.')]));
// 			} else {
// 				const value = _.get(row, columnKey);
//
// 				if (value !== undefined && value !== null) {
// 					values.push(value);
// 				}
// 			}
// 		}
// 	}
//
// 	return distinct ? _.uniq(values) : values;
// }

// export function setValues<T = any>(
// 	data: T,
// 	values: any[],
// 	valueKey: string,
// 	columns: {
// 		columnKey: string;
// 		columnMapping?: string;
// 	}[],
// ): T {
// 	const isArray = Array.isArray(data);
// 	let rows: any = isArray ? data : [data];
//
// 	rows = rows
// 		.map((row: any) => {
// 			for (const { columnKey, columnMapping } of columns) {
// 				const subKey = columnKey.split('.$.');
//
// 				if (subKey.length > 1) {
// 					const subColumnMapping = subKey[0];
// 					let subRow = _.get(row, subColumnMapping);
// 					subRow = _.set(
// 						row,
// 						subColumnMapping,
// 						setValues(subRow, values, valueKey, [
// 							{
// 								columnKey: subKey.slice(1).join('.$.'),
// 								columnMapping: columnMapping,
// 							},
// 						]),
// 					);
// 				} else {
// 					const value = values.find((e) => _.get(e, valueKey) === _.get(row, columnKey));
// 					row = columnMapping ? _.set(row, columnMapping, value ?? null) : value;
// 				}
// 			}
//
// 			return row;
// 		})
// 		.filter((row: any) => row !== null && row !== undefined);
//
// 	return isArray ? rows : rows[0];
// }
//
// export function camelCase(obj: any): any {
// 	return _.mapKeys(obj, (v, k) => _.camelCase(k));
// }

// export async function checkCodeExist({ code, checkExist }: CheckCodeExistDto): Promise<boolean> {
// 	if (!code) {
// 		return;
// 	}
//
// 	const exist = await checkExist();
// 	return !!exist;
// }
