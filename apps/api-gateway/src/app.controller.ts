import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTag } from './decorators/api-tag.decorator';

@Controller()
@ApiTag({ name: 'app' })
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  health() {
    return { status: 'ok', time: new Date().toISOString() };
  }

  @Get('health/db')
  async checkHealthDb() {
    return this.appService.checkHealthDb();
  }
}
