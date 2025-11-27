// jwt.module.ts
import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import type { JwtModuleAsyncOptions, JwtModuleOptions, JwtOptionsFactory } from './jwt.interface';
import { createJwtProvider } from './jwt.providers';
import { JwtService } from './jwt.service';
import { JWT_MODULE_OPTIONS } from "./jwt.constants";

@Global()
@Module({
	providers: [JwtService],
	exports: [JwtService],
})
export class JwtModule {
	static register(options: JwtModuleOptions = {}): DynamicModule {
		return {
			module: JwtModule,
			global: options.global,
			providers: [...createJwtProvider(options), JwtService],
			exports: [JwtService],
		};
	}

	static registerAsync(options: JwtModuleAsyncOptions): DynamicModule {
		return {
			module: JwtModule,
			global: options.global,
			imports: options.imports || [],
			providers: [...this.createAsyncProviders(options), JwtService, ...(options.extraProviders ?? [])],
			exports: [JwtService],
		};
	}

	private static createAsyncProviders(options: JwtModuleAsyncOptions): Provider[] {
		if (options.useExisting || options.useFactory) {
			return [this.createAsyncOptionsProvider(options)];
		}
		return [
			this.createAsyncOptionsProvider(options),
			{
				provide: options.useClass!,
				useClass: options.useClass!,
			},
		];
	}

	private static createAsyncOptionsProvider(options: JwtModuleAsyncOptions): Provider {
		if (options.useFactory) {
			return {
				provide: JWT_MODULE_OPTIONS,
				useFactory: options.useFactory,
				inject: options.inject || [],
			};
		}
		return {
			provide: JWT_MODULE_OPTIONS,
			useFactory: async (factory: JwtOptionsFactory) => await factory.createJwtOptions(),
			inject: [options.useExisting || options.useClass!],
		};
	}
}
