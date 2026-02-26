import { Module } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { AssessmentsController } from './assessments.controller';
import { AiClientModule } from '@app/ai-client';
import { PrismaModule } from '../../../../../prisma/prisma.module';
import { BullmqModule } from '@app/bullmq';

@Module({
	imports: [PrismaModule, BullmqModule, AiClientModule],
	controllers: [AssessmentsController],
	providers: [AssessmentsService],
	exports: [AssessmentsService],
})
export class AssessmentsModule {}
