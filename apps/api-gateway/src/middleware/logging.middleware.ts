import { HttpStatus, Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { colors } from '@app/shared/constants';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
	private readonly logger = new Logger('HTTP');

	use(request: Request, response: Response, next: NextFunction): void {
		const startAt = process.hrtime();
		const { ip, method, originalUrl, body } = request;
		const userAgent = request.get('user-agent') || '';
		const sessionId = uuid().replace(/-/g, '');

		response.on('finish', () => {
			const { statusCode } = response;
			const diff = process.hrtime(startAt);
			const responseTime = diff[0] * 1e3 + diff[1] * 1e-6;

			const okStatus = [HttpStatus.OK, HttpStatus.CREATED, HttpStatus.ACCEPTED, HttpStatus.NOT_MODIFIED];
			if (!okStatus.includes(statusCode) && body) {
				this.logger.log(`PAYLOAD: ${JSON.stringify(body)}`);
			}
			this.logger.log(
				`[${sessionId}] ${colors.FgCyan}${method} ${colors.FgGreen}${originalUrl} ${
					okStatus.includes(statusCode) ? colors.FgYellow : colors.FgRed
				}${statusCode} ${colors.FgYellow}+${responseTime.toFixed(0)}ms`,
			);
		});

		next();
	}
}
