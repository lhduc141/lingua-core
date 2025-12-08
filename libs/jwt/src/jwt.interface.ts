// libs/jwt/src/jwt.interface.ts
import type { ModuleMetadata, Type } from '@nestjs/common';
import type * as jwt from 'jsonwebtoken';

/* =========================================================
 * Payload cho app
 * =======================================================*/

export interface JwtPayloadDto {
	sub: string; // userId
	email?: string;
	isAdmin?: boolean;
	token_type?: 'access' | 'refresh';
	iat?: number;
	exp?: number;
}

/* =========================================================
 * Options cho module
 * =======================================================*/

export interface JwtModuleOptions {
	accessTokenSecret?: string;
	refreshTokenSecret?: string;
	issuer?: string;
	audience?: string;
	accessTokenTtlSec?: number;
	refreshTokenTtlSec?: number;
}

export interface JwtOptionsFactory {
	createJwtOptions(): Promise<JwtModuleOptions> | JwtModuleOptions;
}

export interface JwtModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
	useExisting?: Type<JwtOptionsFactory>;
	useClass?: Type<JwtOptionsFactory>;
	useFactory?: (...args: any[]) => Promise<JwtModuleOptions> | JwtModuleOptions;
	inject?: any[];
}

/* =========================================================
 * Call-level options (cho sign/verify thấp hơn)
 * =======================================================*/

export interface JwtSignOptions extends jwt.SignOptions {
	secret?: jwt.Secret;
}

export interface JwtVerifyOptions extends jwt.VerifyOptions {
	secret?: jwt.Secret;
}
