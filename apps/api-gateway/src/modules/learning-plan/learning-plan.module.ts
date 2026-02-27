import { Module } from '@nestjs/common';
import { LearningPlanService } from './learning-plan.service';
import { LearningPlanController } from './learning-plan.controller';
import { PrismaModule } from '../../../../../prisma/prisma.module';
import { AiClientModule } from '@app/ai-client';
import { BullmqModule } from '@app/bullmq';

@Module({
	imports: [PrismaModule, AiClientModule, BullmqModule],
	controllers: [LearningPlanController],
	providers: [LearningPlanService],
})
export class LearningPlanModule {}
