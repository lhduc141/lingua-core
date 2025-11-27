import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize';

@Injectable()
export class AppService {
  constructor(@InjectConnection() private readonly sequelize: Sequelize) {}

  getHello(): string {
    return 'Hello World!';
  }

  async checkHealthDb() {
    await this.sequelize.authenticate();
    return { db: 'ok' };
  }
}
