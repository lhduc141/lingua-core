import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize';

@Injectable()
export class AppService {
  constructor(@InjectConnection() private readonly sequelize: Sequelize) {}

  async checkHealthDb() {
    await this.sequelize.authenticate();
    return { db: 'ok' };
  }
}
