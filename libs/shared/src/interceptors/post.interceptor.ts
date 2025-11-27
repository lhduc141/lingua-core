import { CallHandler, ExecutionContext, HttpStatus, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';

@Injectable()
export class PostInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest<Request>();
		const response = context.switchToHttp().getResponse<Response>();

		if (request.method === 'POST' && response.statusCode === HttpStatus.CREATED) {
			context.switchToHttp().getResponse().status(HttpStatus.OK);
		}
		return next.handle();
	}
}
