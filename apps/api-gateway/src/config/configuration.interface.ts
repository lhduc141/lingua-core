import { SequelizeModuleOptions } from '@nestjs/sequelize';
import * as dotenv from 'dotenv';

dotenv.config();
export type DatabaseConfig = SequelizeModuleOptions;

export interface AppConfig {
	env: string;
	host: string;
	port: number;
	payloadLimit: string;
}

