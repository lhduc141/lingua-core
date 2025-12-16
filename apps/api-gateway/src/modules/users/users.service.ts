import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'apps/api-gateway/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

import * as argon2 from 'argon2';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';

@Injectable()
export class UsersService {
	constructor(private readonly prisma: PrismaService) {}

	async create(user: CreateUserDto): Promise<User> {
		const { googleSub, email, googleAvatarUrl, googleName } = user;

		return this.prisma.user.create({
			data: {
				googleSub: googleSub,
				email: email,
				googleName: googleName ?? null,
				googleAvatarUrl: googleAvatarUrl ?? null,
				lastLoginAt: new Date(),

			},
		});
	}

	async updateProfile(userId: string, updateProfile: UpdateProfileDto) {
		const { dob, gender, phone } = updateProfile;

		return await this.prisma.user.update({
			where: { userId },
			data: { dob, gender, phone},
		});
	}

	async updateToken(userId: string, refreshToken: string) {
		const refreshHash = await argon2.hash(refreshToken);

		await this.prisma.user.update({
			where: { userId },
			data: {
				currentRefreshTokenHash: refreshHash,
				currentRefreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			},
		});

		return;
	}

	// Tìm user theo google sub
	async findByGoogleSub(googleSub: string): Promise<User | null> {
		return this.prisma.user.findUnique({
			where: { googleSub },
		});
	}

	async findById(userId: string): Promise<User | null> {
		return this.prisma.user.findUnique({ where: { userId } });
	}

	async findActiveById(userId: string): Promise<User | null> {
		const user = await this.findById(userId);
		if (!user) return null;
		if (!user.isActive || user.deletedAt) return null;
		return user;
	}

	async updateLastLogin(userId: string): Promise<void> {
		await this.prisma.user.update({
			where: { userId },
			data: { lastLoginAt: new Date() },
		});
	}

	async clearRefreshToken(userId: string): Promise<void> {
		await this.prisma.user.update({
			where: { userId },
			data: {
				currentRefreshTokenHash: null,
				currentRefreshTokenExpiresAt: null,
			},
		});
	}

	// check user đã tồn tại (googleSub hoặc email)
	async checkExistedUser(googleSub: string, email: string): Promise<boolean> {
		return !!(await this.prisma.user.findFirst({
			where: {
				OR: [{ googleSub }, { email }],
			},
		}));
	}

	// verify refresh token hash, trả về user nếu hợp lệ
	async validateRefreshToken(userId: string, refreshToken: string): Promise<User | null> {
		const user = await this.findActiveById(userId);
		if (!user) return null;
		if (!user.currentRefreshTokenHash) return null;

		const match = await argon2.verify(user.currentRefreshTokenHash, refreshToken);
		if (!match) return null;

		return user;
	}
}
