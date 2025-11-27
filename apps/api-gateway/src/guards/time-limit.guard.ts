import { CanActivate, ExecutionContext, ForbiddenException, mixin, Type } from '@nestjs/common';

export function TimeLimitGuardFactory(deadline: Date | string, message?: string): Type<CanActivate> {
	class TimeLimitGuard implements CanActivate {
		canActivate(context: ExecutionContext): boolean {
			const now = new Date();
			const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline;
			if (now > deadlineDate) {
				throw new ForbiddenException(message || 'Endpoint này đã hết hạn sử dụng');
			}
			return true;
		}
	}
	return mixin(TimeLimitGuard);
}
