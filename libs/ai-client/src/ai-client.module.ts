import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AiClientService } from './ai-client.service';

@Module({
	imports: [
		ClientsModule.register([
			{
				name: 'AI_SERVICE',
				transport: Transport.TCP,
				options: {
					host: process.env.AI_SERVICE_HOST || 'localhost',
					port: Number(process.env.AI_SERVICE_PORT || 4001),
				},
			},
		]),
	],
	providers: [AiClientService],
	exports: [AiClientService],
})
export class AiClientModule {}
