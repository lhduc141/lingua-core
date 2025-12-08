import { JWT_MODULE_OPTIONS } from './jwt.constants';
import { JwtModuleOptions } from './jwt.interface';

export function createJwtProvider(options: JwtModuleOptions): any[] {
	return [
		{
			provide: JWT_MODULE_OPTIONS,
			useValue: options || {},
		},
	];
}
