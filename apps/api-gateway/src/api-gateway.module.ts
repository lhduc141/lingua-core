import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ApiGatewayController } from './api-gateway.controller';
import { ApiGatewayService } from './api-gateway.service';
import { LoggerMiddleware } from './middleware/logging.middleware';
import { MainModule } from './modules/main.module';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@app/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
	imports: [
		ConfigModule.forRoot({
			load: [configuration],
			isGlobal: true,
			envFilePath: __dirname + '/../.env',
		}),
		ClientsModule.register([
			{
				name: 'AI_SERVICE',
				transport: Transport.TCP,
				options: {
					host: process.env.AI_SERVICE_HOST || 'localhost',
					port: Number(process.env.AI_SERVICE_PORT) || 4001,
				},
			},
		]),
		JwtModule.register({}),
		MainModule,
		PrismaModule,
		AuthModule,
	],
	controllers: [ApiGatewayController],
	providers: [ApiGatewayService],
})
export class ApiGatewayModule implements NestModule {
	configure(consumer: MiddlewareConsumer): void {
		consumer.apply(LoggerMiddleware).forRoutes('*');
	}
}
