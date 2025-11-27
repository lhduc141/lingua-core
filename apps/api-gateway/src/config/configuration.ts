import { Dialect } from 'sequelize';
import { AppConfig, DatabaseConfig } from './configuration.interface';
import * as dotenv from 'dotenv';

dotenv.config();

export default () => {
	const app: AppConfig = {
		env: process.env.NODE_ENV || 'development',
		host: process.env.HOST || '0.0.0.0',
		port: parseInt(process.env.PORT || '5432', 10),
		payloadLimit: process.env.PAYLOAD_LIMIT || '50mb',
	};

	// 	Connect Database
	const database: DatabaseConfig = {
		dialect: (process.env.DATABASE_DIALECT || 'postgres') as Dialect,
		host: process.env.DATABASE_HOST || 'localhost',
		port: parseInt(process.env.DATABASE_PORT || '5432', 10),
		username: process.env.DATABASE_USERNAME || '',
		password: process.env.DATABASE_PASSWORD || '',
		database: process.env.DATABASE_DATABASE || '',
		logging: process.env.DATABASE_LOGGING === 'true',
		define: {
			whereMergeStrategy: 'and',
			underscored: true,
			paranoid: true,
		},
		autoLoadModels: true,
		synchronize: false,
		dialectOptions: {
			timezone: '+07:00',
		},
	};

	return { app, database };
};
