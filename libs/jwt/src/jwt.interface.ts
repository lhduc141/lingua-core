import * as jwt from 'jsonwebtoken';
import { ModuleMetadata, Provider, Type } from '@nestjs/common';

/* =========================================================
 * Secret provider & request type
 * =======================================================*/

export enum JwtSecretRequestType {
	SIGN,
	VERIFY,
}

export type GetSecretKeyResult = string | Buffer;

/* =========================================================
 * App payloads (monolith)
 * =======================================================*/

export interface AccessPayload extends jwt.JwtPayload {
	token_type: 'access';
	sub: string; // userId
	email: string;
	isAdmin: boolean;
	session_id?: string;
	scopes?: string[];
}

export interface RefreshPayload extends jwt.JwtPayload {
	token_type: 'refresh';
	sub: string; // userId
	session_id: string;
	token_id?: string; // jti cho rotation (optional)
}

/** Để dành tương lai khi tách microservices (không bắt buộc dùng) */
export interface ServicePayload extends jwt.JwtPayload {
	token_type: 'service';
	sub: string; // service-id/name
	scope?: string; // space-separated (chuẩn OAuth)
}

/* =========================================================
 * Module options (đơn giản hoá)
 * =======================================================*/

export interface JwtModuleOptions {
	global?: boolean;

	// HS256: dùng 'secret'
	// RS*: có thể dùng 'privateKey' để ký & 'publicKey' để verify
	secret?: string | Buffer;
	publicKey?: string | Buffer;
	privateKey?: jwt.Secret;

	// Mặc định options cho sign/verify (sẽ được merge khi gọi)
	signOptions?: jwt.SignOptions;
	verifyOptions?: jwt.VerifyOptions;

	// Tùy chọn: cấp secret/keys động (hỗ trợ async, multi-tenant, KMS...)
	secretOrKeyProvider?: (
		requestType: JwtSecretRequestType,
		tokenOrPayload: string | object | Buffer,
		options?: JwtVerifyOptions | JwtSignOptions,
	) => GetSecretKeyResult | Promise<GetSecretKeyResult>;
}

/* =========================================================
 * Factory & Async module wiring
 * =======================================================*/

export interface JwtOptionsFactory {
	createJwtOptions(): Promise<JwtModuleOptions> | JwtModuleOptions;
}

export interface JwtModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
	global?: boolean;
	useExisting?: Type<JwtOptionsFactory>;
	useClass?: Type<JwtOptionsFactory>;
	useFactory?: (...args: any[]) => Promise<JwtModuleOptions> | JwtModuleOptions;
	inject?: any[];
	extraProviders?: Provider[];
}

/* =========================================================
 * Call-level options tiện dụng (thêm secret/private/public inline)
 * =======================================================*/

export interface JwtSignOptions extends jwt.SignOptions {
	secret?: string | Buffer;
	privateKey?: jwt.Secret;
}

export interface JwtVerifyOptions extends jwt.VerifyOptions {
	secret?: string | Buffer;
	publicKey?: string | Buffer;
}
