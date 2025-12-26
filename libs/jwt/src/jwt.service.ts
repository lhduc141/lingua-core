// libs/jwt/src/jwt.service.ts
import { Inject, Injectable, Logger, Optional, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { JWT_DEFAULTS, JWT_MODULE_OPTIONS } from './jwt.constants';
import type { JwtModuleOptions, JwtPayloadDto, JwtSignOptions, JwtVerifyOptions } from './jwt.interface';

@Injectable()
export class JwtService {
	private readonly logger = new Logger(JwtService.name);

	constructor(
		@Inject(JWT_MODULE_OPTIONS)
		@Optional()
		private readonly options: JwtModuleOptions = {},
	) {}

	/* ================== HIGH-LEVEL API ================== */

	private get accessSecret(): jwt.Secret {
		return this.options.accessTokenSecret || JWT_DEFAULTS.ACCESS_SECRET;
	}

	private get refreshSecret(): jwt.Secret {
		return this.options.refreshTokenSecret || JWT_DEFAULTS.REFRESH_SECRET;
	}

	private get issuer(): string {
		return this.options.issuer || JWT_DEFAULTS.ISS;
	}

	private get audience(): string {
		return this.options.audience || JWT_DEFAULTS.AUD;
	}

	private get accessTtlSec(): number {
		return this.options.accessTokenTtlSec || JWT_DEFAULTS.ACCESS_TTL_SEC;
	}

	private get refreshTtlSec(): number {
		return this.options.refreshTokenTtlSec || JWT_DEFAULTS.REFRESH_TTL_SEC;
	}

	async signAccessToken(payload: JwtPayloadDto): Promise<string> {
		const pl: JwtPayloadDto = {
			...payload,
			token_type: 'access',
		};

		return this.signAsync(pl, {
			secret: this.accessSecret,
			expiresIn: this.accessTtlSec,
			issuer: this.issuer,
			audience: this.audience,
			algorithm: JWT_DEFAULTS.ALG as jwt.Algorithm,
			keyid: JWT_DEFAULTS.KID,
		});
	}

	async signRefreshToken(payload: JwtPayloadDto): Promise<string> {
		const pl: JwtPayloadDto = {
			...payload,
			token_type: 'refresh',
		};

		return this.signAsync(pl, {
			secret: this.refreshSecret,
			expiresIn: this.refreshTtlSec,
			issuer: this.issuer,
			audience: this.audience,
			algorithm: JWT_DEFAULTS.ALG as jwt.Algorithm,
			keyid: JWT_DEFAULTS.KID,
		});
	}

	async verifyAccessToken<T extends JwtPayloadDto = JwtPayloadDto>(token: string): Promise<T> {
		try {
			const payload = await this.verifyAsync<T>(token, {
				secret: this.accessSecret,
				issuer: this.issuer,
				audience: this.audience,
				algorithms: [JWT_DEFAULTS.ALG as jwt.Algorithm],
			});

			if (payload.token_type !== 'access') {
				throw new UnauthorizedException('Invalid token type: expected access token');
			}

			return payload;
		} catch (error) {
			if (error instanceof UnauthorizedException) {
				throw error;
			}

			if (error.name === 'TokenExpiredError') {
				throw new UnauthorizedException('Access token has expired');
			}
			if (error.name === 'JsonWebTokenError') {
				throw new UnauthorizedException('Invalid access token');
			}
			if (error.name === 'NotBeforeError') {
				throw new UnauthorizedException('Access token not yet valid');
			}

			this.logger.error('Unexpected error verifying access token', error);
			throw new UnauthorizedException('Token verification failed');
		}
	}

	async verifyRefreshToken<T extends JwtPayloadDto = JwtPayloadDto>(token: string): Promise<T> {
		try {
			const payload = await this.verifyAsync<T>(token, {
				secret: this.refreshSecret,
				issuer: this.issuer,
				audience: this.audience,
				algorithms: [JWT_DEFAULTS.ALG as jwt.Algorithm],
			});

			if (payload.token_type !== 'refresh') {
				throw new UnauthorizedException('Invalid token type: expected refresh token');
			}

			return payload;
		} catch (error) {
			if (error instanceof UnauthorizedException) {
				throw error;
			}

			if (error.name === 'TokenExpiredError') {
				throw new UnauthorizedException('Refresh token has expired');
			}

			if (error.name === 'JsonWebTokenError') {
				throw new UnauthorizedException('Invalid refresh token');
			}

			this.logger.error('Unexpected error verifying refresh token', error);
			throw new UnauthorizedException('Token verification failed');
		}
	}

	/* ================== LOW-LEVEL API ================== */

	sign(payload: string | Buffer | object, options?: JwtSignOptions): string {
		const { secret, ...rest } = options || {};

		const finalSecret: jwt.Secret = secret || this.accessSecret;

		return jwt.sign(payload, finalSecret, {
			issuer: this.issuer,
			audience: this.audience,
			algorithm: JWT_DEFAULTS.ALG as jwt.Algorithm,
			keyid: JWT_DEFAULTS.KID,
			...rest,
		});
	}

	signAsync(payload: string | Buffer | object, options?: JwtSignOptions): Promise<string> {
		return new Promise((resolve, reject) => {
			try {
				const token = this.sign(payload, options);
				resolve(token);
			} catch (err) {
				this.logger.error('Error signing JWT', err);
				reject(err);
			}
		});
	}

	verify<T = any>(token: string, options?: JwtVerifyOptions): T {
		const { secret, ...rest } = options || {};
		const finalSecret: jwt.Secret = secret || this.accessSecret;

		return jwt.verify(token, finalSecret, {
			issuer: this.issuer,
			audience: this.audience,
			algorithms: [JWT_DEFAULTS.ALG as jwt.Algorithm],
			...rest,
		}) as T;
	}

	verifyAsync<T = any>(token: string, options?: JwtVerifyOptions): Promise<T> {
		return new Promise((resolve, reject) => {
			try {
				const payload = this.verify<T>(token, options);
				resolve(payload);
			} catch (err) {
				this.logger.error('Error verifying JWT', err);
				reject(err);
			}
		});
	}

	decode<T = any>(token: string): T | null {
		try {
			return jwt.decode(token) as T;
		} catch (error) {
			this.logger.warn('Failed to decode JWT', error);
			return null;
		}
	}

	getTokenExpiry(token: string): Date | null {
		const decoded = this.decode<{ exp?: number }>(token);
		if (decoded?.exp) {
			return new Date(decoded.exp * 1000);
		}
		return null;
	}
	isTokenExpired(token: string): boolean {
		const expiry = this.getTokenExpiry(token);
		if (!expiry) return true;
		return expiry < new Date();
	}
}
