import { Module } from '@nestjs/common';
import { LearningService } from './learning.service';
import { LearningController } from './learning.controller';
import { PrismaModule } from '../../../../../prisma/prisma.module';

@Module({
	imports: [PrismaModule],
	controllers: [LearningController],
	providers: [LearningService],
})
export class LearningModule {}
