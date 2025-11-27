import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { JwtModuleOptions } from './jwt.interface';
import * as jwt from 'jsonwebtoken';
import {JWT_DEFAULTS, JWT_MODULE_OPTIONS } from "./jwt.constants";

@Injectable()
export class JwtService {
	private readonly logger = new Logger(JwtService.name);

	constructor(
		@Inject(JWT_MODULE_OPTIONS)
		@Optional()
		private readonly options: JwtModuleOptions = {},
	) {}

	/* ================== HIGH-LEVEL ================== */

	// Ký ACCESS token
	async signAccess(p: { userId: string; email: string; isAdmin: boolean; sessionId?: string }) {
		const payload = {
			token_type: 'access',
			sub: p.userId,
			email: p.email,
			isAdmin: p.isAdmin,
			session_id: p.sessionId,
		};

		return this.signAsync(payload, {
			expiresIn: JWT_DEFAULTS.ACCESS_TTL_SEC, // 15 phút
			algorithm: JWT_DEFAULTS.ALG as jwt.Algorithm,
			issuer: JWT_DEFAULTS.ISS,
			audience: JWT_DEFAULTS.AUD,
			keyid: JWT_DEFAULTS.KID,
		});
	}

	async verifyAccess(token: string) {
		const pl = await this.verifyAsync<any>(token);
		if (pl.token_type !== 'access') throw new Error('Invalid token type');
		return pl;
	}

	// Ký REFRESH token
	async signRefresh(p: { userId: string; sessionId: string }) {
		const payload = {
			token_type: 'refresh',
			sub: p.userId,
			session_id: p.sessionId,
		};

		return this.signAsync(payload, {
			expiresIn: JWT_DEFAULTS.REFRESH_TTL_SEC, // 30 ngày
			algorithm: JWT_DEFAULTS.ALG as jwt.Algorithm,
			issuer: JWT_DEFAULTS.ISS,
			audience: JWT_DEFAULTS.AUD,
			keyid: JWT_DEFAULTS.KID,
		});
	}

	async verifyRefresh(token: string) {
		const pl = await this.verifyAsync<any>(token);
		if (pl.token_type !== 'refresh') throw new Error('Invalid token type');
		return pl;
	}

	/* ================== LOW-LEVEL ================== */

	sign(payload: string | Buffer | object, options?: jwt.SignOptions): string {
		const secret: jwt.Secret = (this.options.secret ?? process.env.JWT_SECRET ?? 'dev-secret') as jwt.Secret;
		const mergedOpts: jwt.SignOptions = this._mergeSignOptions(options);
		return jwt.sign(payload as any, secret, mergedOpts);
	}

	signAsync(payload: string | Buffer | object, options?: jwt.SignOptions): Promise<string> {
		const secret: jwt.Secret = (this.options.secret ?? process.env.JWT_SECRET ?? 'dev-secret') as jwt.Secret;
		const mergedOpts: jwt.SignOptions = this._mergeSignOptions(options);
		return new Promise<string>((resolve, reject) => {
			jwt.sign(payload as any, secret, mergedOpts, (err, tok) => (err ? reject(err) : resolve(tok!)));
		});
	}

	verify<T = any>(token: string, options?: jwt.VerifyOptions): T {
		const secret: jwt.Secret = (this.options.secret ?? process.env.JWT_SECRET ?? 'dev-secret') as jwt.Secret;
		const verifyOpts = this._mergeVerifyOptions(options);
		return jwt.verify(token, secret, verifyOpts) as T;
	}

	verifyAsync<T = any>(token: string, options?: jwt.VerifyOptions): Promise<T> {
		const secret: jwt.Secret = (this.options.secret ?? process.env.JWT_SECRET ?? 'dev-secret') as jwt.Secret;
		const verifyOpts = this._mergeVerifyOptions(options);
		return new Promise<T>((resolve, reject) => {
			jwt.verify(token, secret, verifyOpts, (err, decoded) => (err ? reject(err) : resolve(decoded as T)));
		});
	}

	decode<T = any>(token: string): T | null {
		return jwt.decode(token) as T | null;
	}

	/* ================== PRIVATE ================== */

	private _mergeSignOptions(options?: jwt.SignOptions): jwt.SignOptions {
		const defaults: jwt.SignOptions = {
			algorithm: JWT_DEFAULTS.ALG as jwt.Algorithm,
			issuer: JWT_DEFAULTS.ISS,
			audience: JWT_DEFAULTS.AUD,
			keyid: JWT_DEFAULTS.KID,
		};
		return { ...defaults, ...(options || {}) };
	}

	private _mergeVerifyOptions(options?: jwt.VerifyOptions): jwt.VerifyOptions {
		const defaults: jwt.VerifyOptions = {
			algorithms: [JWT_DEFAULTS.ALG as jwt.Algorithm],
			issuer: JWT_DEFAULTS.ISS,
			audience: JWT_DEFAULTS.AUD,
		};
		return { ...defaults, ...(options || {}) };
	}
}
