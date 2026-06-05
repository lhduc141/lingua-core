import { Module } from '@nestjs/common';
import { AiServiceController } from './ai-service.controller';
import { AiServiceService } from './ai-service.service';
import { ConfigModule } from '@nestjs/config';
import { GrammarCheckService } from './grammar-check/grammar-check.service';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: '.env',
		}),
	],
	controllers: [AiServiceController],
	providers: [AiServiceService, GrammarCheckService],
})
export class AiServiceModule {}
