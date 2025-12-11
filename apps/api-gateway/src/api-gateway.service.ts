import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApiGatewayService {
	constructor(private readonly prisma: PrismaService) {}

	async checkHealthDb() {
		try {
			await this.prisma.$queryRaw`SELECT 1`;
			return { db: 'ok' };
		} catch (err) {
			return { db: 'error', message: (err as Error).message };
		}
	}
}
