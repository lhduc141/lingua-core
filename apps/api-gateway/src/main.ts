import { ConfigService } from '@nestjs/config';
import { AppConfig } from './config/configuration.interface';

import { DefaultResponseInterceptor, PostInterceptor, ValidationErrorException } from '@app/shared';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiGatewayModule } from './api-gateway.module';

import { json, urlencoded } from 'express';
import 'source-map-support/register';
import { useApiSwagger } from './swagger';
import compression from 'compression';

async function bootstrap() {
	const logger = new Logger('Application', { timestamp: true });
	const app = await NestFactory.create(ApiGatewayModule);

	const configService = app.get(ConfigService);
	const appConfig = configService.getOrThrow<AppConfig>('app');

	app.enableCors({
		origin: [
			'http://localhost:3000',
			'http://localhost:3001',
			'https://lingua-panda.io.vn',
			'https://lingua-portal.vercel.app',
		],
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
	});

	app.use(urlencoded({ extended: true, limit: appConfig.payloadLimit }));
	app.use(json({ limit: appConfig.payloadLimit }));
	app.use(compression());
	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
			transformOptions: {
				enableImplicitConversion: true,
			},
			whitelist: true,
			exceptionFactory: (errors) => {
				throw new ValidationErrorException(errors);
			},
		}),
	);
	app.useGlobalInterceptors(
		new PostInterceptor(),
		new DefaultResponseInterceptor(),
		// new ClassSerializerInterceptor(app.get(Reflector), {
		//   enableImplicitConversion: true,
		//   excludeExtraneousValues: true,
		//   excludePrefixes: ['_'],
		// }),
	);
	useApiSwagger(app, 'docs');

	await app.listen(appConfig.port, appConfig.host, async () => {
		logger.log(`is running on: ${await app.getUrl()} [${appConfig.env}]`);
		logger.log(`API documentation: ${await app.getUrl()}/docs`);
	});
}
bootstrap();
