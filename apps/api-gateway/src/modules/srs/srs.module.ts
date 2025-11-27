import { Module } from '@nestjs/common';
import { SrsService } from './srs.service';
import { SrsController } from './srs.controller';

@Module({
  controllers: [SrsController],
  providers: [SrsService],
})
export class SrsModule {}
