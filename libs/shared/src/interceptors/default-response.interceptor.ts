import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { DefaultResponseDto } from '../dto';

@Injectable()
export class DefaultResponseInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		return next.handle().pipe(map((data: any) => data ?? new DefaultResponseDto()));
	}
}
