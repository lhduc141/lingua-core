import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
	const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
		transport: Transport.TCP,
		options: {
			host: '0.0.0.0', // cho phép connect từ ngoài (VPS)
			port: 4001, // port microservice AI
		},
	});

	await app.listen();
	console.log('AI service microservice is listening on TCP 4001');
}
bootstrap();
