import { NestFactory } from '@nestjs/core';
import { AiServiceModule } from './ai-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
	const app = await NestFactory.createMicroservice<MicroserviceOptions>(AiServiceModule, {
		transport: Transport.TCP,
		options: {
			host: '0.0.0.0',
			port: 4001,
		},
	});

	await app.listen();
	console.log('AI service microservice is listening on TCP');
}
bootstrap();
