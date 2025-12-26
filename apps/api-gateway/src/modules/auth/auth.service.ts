import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginTicket, OAuth2Client } from 'google-auth-library';
import { JwtPayloadDto, JwtService } from '@app/jwt';
import { UsersService } from '../users/users.service';
import { ResponseDto } from '@app/shared';
import { ProfileMeDto } from './dto/profile-me.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';

@Injectable()
export class AuthService {
	private googleClient: OAuth2Client;

	constructor(
		private readonly jwt: JwtService,
		private readonly userService: UsersService,
	) {
		this.googleClient = new OAuth2Client(
			process.env.GOOGLE_CLIENT_ID,
			process.env.GOOGLE_CLIENT_SECRET,
			process.env.GOOGLE_CALLBACK_URL,
		);
	}

	//!			MAIN-FUNCTION
	async googleAuth(googleAuthDto: GoogleAuthDto) {
		return this._handleGoogleAuth(googleAuthDto);
	}

	async refresh(refreshToken: string) {
		return await this._handleRefreshToken(refreshToken);
	}
	async logout(userId: string): Promise<ResponseDto<null>> {
		await this.userService.clearRefreshToken(userId);
		return new ResponseDto<null>({
			message: 'Đăng xuất thành công',
		});
	}

	async getProfile(userId: string): Promise<ResponseDto<ProfileMeDto>> {
		return this.userService.getProfile(userId);
	}
	async updateProfile(userId: string, profileDto: UpdateProfileDto) {
		return this.userService.updateProfile(userId, profileDto);
	}
	async deleteAccount(userId: string): Promise<ResponseDto<null>> {
		return this.userService.deleteAccount(userId);
	}

	//! 	  	SUB HANDLE FUNCTION
	async _handleRefreshToken(refreshToken: string) {
		if (!refreshToken) throw new UnauthorizedException('Missing refresh token');

		let payload: JwtPayloadDto;
		try {
			payload = await this.jwt.verifyRefreshToken(refreshToken);
		} catch {
			throw new UnauthorizedException('Invalid or expired refresh token');
		}

		const user = await this.userService.validateRefreshToken(payload.sub, refreshToken);
		if (!user) throw new UnauthorizedException('Refresh token invalid');

		const jwtPayload = {
			sub: user.userId,
			email: user.email,
			userId: user.userId,
			isAdmin: user.isAdmin,
		};

		const newAccessToken = await this.jwt.signAccessToken(jwtPayload);

		return { accessToken: newAccessToken };
	}

	async _handleGoogleAuth(googleAuthDto: GoogleAuthDto) {
		const googlePayload = await this._verifyGoogleToken(googleAuthDto.idToken); //	Check google token validation
		const { user, isNewUser } = await this.userService.findOrCreateFromGoogle(googlePayload);

		const { accessToken, refreshToken } = await this._generateTokens(user);
		await this.userService.saveRefreshToken(user.userId, refreshToken);

		return {
			user: {
				userId: user.userId,
				email: user.email,
				googleName: user.googleName,
				googleAvatarUrl: user.googleAvatarUrl,
				isAdmin: user.isAdmin,
				isNewUser,
			},
			accessToken,
			refreshToken,
		};
	}
	private async _verifyGoogleToken(idToken: string) {
		const ticket: LoginTicket = await this.googleClient.verifyIdToken({
			idToken,
			audience: process.env.GOOGLE_CLIENT_ID,
		});
		const payload = ticket.getPayload();
		if (!payload) {
			throw new UnauthorizedException('Invalid Google token');
		}

		const { sub: googleSub, email, name, picture } = payload;

		if (!googleSub || !email) {
			throw new UnauthorizedException('Google token missing required fields');
		}

		return { googleSub, email, name, picture };
	}

	private async _generateTokens(user: { userId: string; email: string; isAdmin: boolean }) {
		const jwtPayload: JwtPayloadDto = {
			sub: user.userId,
			email: user.email,
			userId: user.userId,
			isAdmin: user.isAdmin,
		};

		const [accessToken, refreshToken] = await Promise.all([
			this.jwt.signAccessToken(jwtPayload),
			this.jwt.signRefreshToken(jwtPayload),
		]);

		return { accessToken, refreshToken };
	}
}
