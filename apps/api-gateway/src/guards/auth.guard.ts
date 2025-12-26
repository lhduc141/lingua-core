import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
// import { AuthService } from '../modules/auth/auth.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Reflector } from '@nestjs/core';
import { JwtPayloadDto, JwtService } from '@app/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly jwt: JwtService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest();
		if (!request.url.includes('/api/')) return true;

		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (isPublic) return true;

		const authHeader = request.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer '))
			throw new UnauthorizedException('Missing or invalid Authorization header');
		const token = authHeader.replace('Bearer ', '').trim();
		let decoded: JwtPayloadDto;

		try {
			decoded = await this.jwt.verifyAccessToken(token);
		} catch (err) {
			throw new UnauthorizedException('Invalid or expired token');
		}

		request.user = decoded;
		return true;
	}
}
