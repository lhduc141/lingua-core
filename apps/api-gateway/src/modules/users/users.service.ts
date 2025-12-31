import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';
import { ProfileMeDto } from '../auth/dto/profile-me.dto';
import { ResponseDto } from '@app/shared';
import * as argon2 from 'argon2';

interface GoogleUserPayload {
	googleSub: string;
	email: string;
	name?: string;
	picture?: string;
}

@Injectable()
export class UsersService {
	constructor(private readonly prisma: PrismaService) {}

	async findOrCreateFromGoogle(googlePayload: GoogleUserPayload): Promise<{ user: User; isNewUser: boolean }> {
		let user = await this.prisma.user.findUnique({
			where: { googleSub: googlePayload.googleSub },
		});

		let isNewUser = false;
		if (!user) {
			user = await this.prisma.user.create({
				data: {
					googleSub: googlePayload.googleSub,
					email: googlePayload.email,
					googleName: googlePayload.name ?? null,
					googleAvatarUrl: googlePayload.picture ?? null,
					isActive: true,
					lastLoginAt: new Date(),
				},
			});
			isNewUser = true;
		} else {
			this._validateUserStatus(user);

			await this.prisma.user.update({
				where: { userId: user.userId },
				data: { lastLoginAt: new Date() },
			});
		}

		return { user, isNewUser };
	}

	async getProfile(userId: string): Promise<ResponseDto<ProfileMeDto>> {
		const user = await this.prisma.user.findUnique({
			where: { userId },
			select: {
				userId: true,
				email: true,
				googleName: true,
				googleAvatarUrl: true,
				dob: true,
				gender: true,
				phone: true,
				isAdmin: true,
				createdAt: true,
			},
		});

		if (!user) {
			throw new NotFoundException('User not found');
		}

		return new ResponseDto<ProfileMeDto>({
			message: 'Lấy thông tin thành công',
			data: user,
		});
	}

	async updateProfile(userId: string, dto: UpdateProfileDto): Promise<ResponseDto<ProfileMeDto>> {
		const user = await this.prisma.user.update({
			where: { userId },
			data: {
				dob: dto.dob ? new Date(dto.dob) : undefined,
				gender: dto.gender,
				phone: dto.phone,
			},
			select: {
				userId: true,
				email: true,
				googleName: true,
				googleAvatarUrl: true,
				dob: true,
				gender: true,
				phone: true,
				isAdmin: true,
				createdAt: true,
			},
		});

		return new ResponseDto<ProfileMeDto>({
			message: 'Cập nhật thông tin thành công',
			data: user,
		});
	}

	async deleteAccount(userId: string): Promise<ResponseDto<null>> {
		await this.prisma.user.update({
			where: { userId },
			data: {
				deletedAt: new Date(),
				isActive: false,
				currentRefreshTokenHash: null,
				currentRefreshTokenExpiresAt: null,
			},
		});

		return new ResponseDto<null>({
			message: 'Tài khoản đã được xóa thành công',
		});
	}

	async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
		const hashedToken = await argon2.hash(refreshToken);
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7);

		await this.prisma.user.update({
			where: { userId },
			data: {
				currentRefreshTokenHash: hashedToken,
				currentRefreshTokenExpiresAt: expiresAt,
			},
		});
	}

	async validateRefreshToken(userId: string, refreshToken: string) {
		const user = await this.prisma.user.findUnique({
			where: { userId },
			select: {
				userId: true,
				email: true,
				isAdmin: true,
				isActive: true,
				deletedAt: true,
				currentRefreshTokenHash: true,
				currentRefreshTokenExpiresAt: true,
			},
		});

		if (!user) return null;

		if (!user.isActive || user.deletedAt) return null;
		if (!user.currentRefreshTokenHash) return null;
		const isValid = await argon2.verify(refreshToken, user.currentRefreshTokenHash);

		if (!isValid) return null;
		if (!user.currentRefreshTokenExpiresAt || user.currentRefreshTokenExpiresAt < new Date()) {
			return null;
		}

		return user;
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

	// PRIVATE HELPERS
	private _validateUserStatus(user: { isActive: boolean; deletedAt: Date | null }): void {
		if (user.deletedAt)
			throw new UnauthorizedException('Your account has been deleted. Please contact support to restore.');
		if (!user.isActive) throw new UnauthorizedException('Your account is inactive. Please contact support.');
	}
}
