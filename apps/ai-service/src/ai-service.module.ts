import { Module } from '@nestjs/common';
import { AiServiceController } from './ai-service.controller';
import { AiServiceService } from './ai-service.service';
import { ConfigModule } from '@nestjs/config';
import { GrammarCheckService } from './grammar-check/grammar-check.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: '.env',
		}),
		PrismaModule,
	],
	controllers: [AiServiceController],
	providers: [AiServiceService, GrammarCheckService],
})
export class AiServiceModule {}
