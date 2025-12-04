import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTag } from './decorators/api-tag.decorator';

@Controller()
@ApiTag({ name: 'app' })
export class AppController {
  constructor(private readonly appService: AppService) {}


  @Get('health/db')
  async checkHealthDb() {
    return this.appService.checkHealthDb();
  }
}
