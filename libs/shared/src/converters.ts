export function b64Encode(value: string): string {
	return Buffer.from(value, 'utf8').toString('base64');
}

export function b64Decode(value: string): string {
	return Buffer.from(value, 'base64').toString('utf8');
}

export function jsonToFormData(object: object): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(object)) {
		formData.append(key, String(value));
	}
	return formData;
}
