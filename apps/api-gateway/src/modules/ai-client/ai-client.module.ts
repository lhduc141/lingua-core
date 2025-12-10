import { Module } from '@nestjs/common';
import { AiClientService } from './ai-client.service';
import { AiClientController } from './ai-client.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
	imports: [
		ClientsModule.register([
			{
				name: 'AI_SERVICE',
				transport: Transport.TCP,
				options: {
					host: process.env.AI_SERVICE_HOST || 'localhost',
					port: Number(process.env.AI_SERVICE_PORT ?? 4001), // trùng với port ai-service
				},
			},
		]),
	],
	controllers: [AiClientController],
	providers: [AiClientService],
	exports: [AiClientService],
})
export class AiClientModule {}
