export const JWT_MODULE_OPTIONS = 'JWT_MODULE_OPTIONS';

export const JWT_DEFAULTS = {
	// Secrets
	ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'default-access-secret-change-me',
	REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-me',

	// Claims
	ISS: 'linguapanda-api',
	AUD: 'linguapanda-app',

	// TTL
	ACCESS_TTL_SEC: parseInt(process.env.JWT_ACCESS_TTL || '864000', 10), // 15m
	REFRESH_TTL_SEC: parseInt(process.env.JWT_REFRESH_TTL || '2592000', 10), // 30d

	// Algorithm & Key ID
	ALG: process.env.JWT_ALG || 'HS256',
	KID: process.env.JWT_KID || 'default',
};
