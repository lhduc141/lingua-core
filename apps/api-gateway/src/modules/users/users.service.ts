import { Injectable } from '@nestjs/common';
import { PrismaService } from 'apps/api-gateway/prisma/prisma.service';

@Injectable()
export class UsersService {
	constructor(private readonly prisma: PrismaService) {}

	findAll() {
		return this.prisma.user.findMany();
	}

	create(data: { email: string; username?: string }) {
		return this.prisma.user.create({
			data: {
				email: data.email,
				username: data.username ?? null,
			},
		});
	}
}
