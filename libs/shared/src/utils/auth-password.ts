import * as argon2 from 'argon2';

const saltRound = 10;

const PEPPER = process.env.APP_PASSWORD_PEPPER || '';
const ARGON2_MEMORY_COST = Number(process.env.ARGON2_MEMORY_COST || 19_456); // ~19MB
const ARGON2_TIME_COST = Number(process.env.ARGON2_TIME_COST || 1);
const ARGON2_PARALLELISM = Number(process.env.ARGON2_PARALLELISM || 1);

export async function hashPassword(rawPassword: string): Promise<string> {
	const pwd = rawPassword + PEPPER;
	return argon2.hash(pwd, {
		type: argon2.argon2id,
		memoryCost: ARGON2_MEMORY_COST,
		timeCost: ARGON2_TIME_COST,
		parallelism: ARGON2_PARALLELISM,
	});
}

export async function verifyPassword(storedHash: string, rawPassword: string): Promise<boolean> {
	const pwd = rawPassword + PEPPER;
	return argon2.verify(storedHash, pwd);
}

/**
 * Kiểm tra có cần rehash không (khi bạn thay đổi tham số bảo mật).
 * - Gọi sau khi verify thành công; nếu true thì rehash & cập nhật DB.
 */
export function needsRehash(storedHash: string): boolean {
	try {
		const m = storedHash.match(/m=(\d+),t=(\d+),p=(\d+)/);
		if (!m) return false;
		const [, mCost, tCost, p] = m.map(Number);
		return mCost !== ARGON2_MEMORY_COST || tCost !== ARGON2_TIME_COST || p !== ARGON2_PARALLELISM;
	} catch {
		return false;
	}
}
