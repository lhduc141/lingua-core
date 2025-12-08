export const JWT_MODULE_OPTIONS = 'JWT_MODULE_OPTIONS';

export const JWT_DEFAULTS = {
	ALG: process.env.JWT_ALG || 'HS256',
	ISS: process.env.JWT_ISS || 'lingua.api',
	AUD: process.env.JWT_AUD || 'lingua.web',
	ACCESS_TTL_SEC: parseInt(process.env.JWT_ACCESS_TTL || '900', 10), // 15m
	REFRESH_TTL_SEC: parseInt(process.env.JWT_REFRESH_TTL || '2592000', 10), // 30d
	SERVICE_TTL_SEC: parseInt(process.env.JWT_SERVICE_TTL || '300', 10), // 5m
	KID: process.env.JWT_KID || 'default',
	ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'access-secret-dev',
	REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'refresh-secret-dev',
};
