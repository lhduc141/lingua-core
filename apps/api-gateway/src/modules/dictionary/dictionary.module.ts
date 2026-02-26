import { Module } from '@nestjs/common';
import { DictionaryService, VocabularyService } from './dictionary.service';
import { DictionaryController } from './dictionary.controller';
import { PrismaModule } from '../../../../../prisma/prisma.module';
import { AiClientModule } from '@app/ai-client';

@Module({
	imports: [PrismaModule, AiClientModule],
	controllers: [DictionaryController],
	providers: [DictionaryService, VocabularyService],
})
export class DictionaryModule {}
