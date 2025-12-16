import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'apps/api-gateway/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { LoginTicket, OAuth2Client } from 'google-auth-library';
import { SignupDto } from './dto/signup.dto';
import { JwtPayloadDto, JwtService } from '@app/jwt';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { ResponseDto } from '@app/shared';
import { ProfileMeDto } from './dto/profile-me.dto';
import { UpdateProfileOnboardingDto } from './dto/update-profile-onboarding.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
	private googleClient: OAuth2Client;

	constructor(
		private readonly prisma: PrismaService,
		private readonly jwt: JwtService,

		private readonly userService: UsersService,
	) {
		this.googleClient = new OAuth2Client(
			process.env.GOOGLE_CLIENT_ID,
			process.env.GOOGLE_CLIENT_SECRET,
			process.env.GOOGLE_CALLBACK_URL,
		);
	}

	//TODO	================================
	//TODO			MAIN-FUNCTION
	//TODO	================================
	async login(loginData: LoginDto) {
		return this._handleLogin(loginData);
	}
	async signup(signupDto: SignupDto) {
		return this._handelSignup(signupDto);
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
	async getProfile(user: JwtPayloadDto): Promise<ResponseDto<ProfileMeDto>> {
		return await this._handleGetProfile(user);
	}
	async updateProfile(user: JwtPayloadDto, profileDto: UpdateProfileDto) {
		return this._handleUpdateProfile(user, profileDto);
	}
	async updateTarget(user: JwtPayloadDto, dto: UpdateProfileOnboardingDto) {
		return await this._handleUpdateTarget(user, dto);
	}

	//TODO	================================
	//TODO 	  	SUB HANDLE FUNCTION
	//TODO	================================

	async _handelSignup(dto: SignupDto) {
		const ticket: LoginTicket = await this.googleClient.verifyIdToken({
			idToken: dto.idToken, // dto.idToken: string
			audience: process.env.GOOGLE_CLIENT_ID,
		});

		const payload = ticket.getPayload();
		if (!payload) throw new UnauthorizedException('Invalid Google token');

		const googleSub = payload.sub;
		const email = payload.email;
		const name = payload.name ?? null;
		const picture = payload.picture ?? null;

		if (!googleSub || !email) throw new UnauthorizedException('Google token missing sub/email');

		const existedUser = await this.userService.checkExistedUser(googleSub, email);
		if (existedUser) throw new ConflictException('Email already in use');

		const data = {
			googleSub,
			email,
			googleName: name,
			googleAvatarUrl: picture,
		} as CreateUserDto;

		const user = await this.userService.create(data);
		if (!user.isActive || user.deletedAt) throw new UnauthorizedException('User is inactive or deleted');

		const jwtPayload = {
			sub: user.userId,
			email: user.email,
			userId: user.userId,
			isAdmin: user.isAdmin,
		};

		const accessToken = await this.jwt.signAccessToken(jwtPayload);
		const refreshToken = await this.jwt.signRefreshToken(jwtPayload);

		//?	Update new user
		await this.userService.updateToken(user.userId, refreshToken);

		return {
			user: {
				userId: user.userId,
				email: user.email,
				googleName: user.googleName,
				googleAvatarUrl: user.googleAvatarUrl,
				isAdmin: user.isAdmin,
			},
			accessToken,
			refreshToken,
		};
	}
	async _handleLogin(dto: LoginDto) {
		//TODO: 	1. 	Verify Google Token
		const ticket = await this.googleClient.verifyIdToken({
			idToken: dto.idToken,
			audience: process.env.GOOGLE_CLIENT_ID,
		});
		const payload = ticket.getPayload();
		if (!payload) throw new UnauthorizedException('Invalid Google token');

		const googleSub = payload.sub;
		const email = payload.email;
		if (!googleSub || !email) throw new UnauthorizedException('Google token missing sub/email');

		//TODO:		2. Tìm user theo googleSub
		const user = await this.prisma.user.findUnique({
			where: { googleSub }, // cần có field này trong schema
		});
		if (!user) throw new NotFoundException('User is not registered');
		if (!user.isActive || user.deletedAt) throw new UnauthorizedException('User is inactive or deleted');

		//TODO:		3. Update LastLoginAt
		await this.prisma.user.update({
			where: { userId: user.userId },
			data: { lastLoginAt: new Date() },
		});

		//TODO:		4. Create JWT
		const jwtPayload = {
			sub: user.userId,
			email: user.email,
			userId: user.userId,
			isAdmin: user.isAdmin,
		};
		const accessToken = await this.jwt.signAccessToken(jwtPayload);
		const refreshToken = await this.jwt.signRefreshToken(jwtPayload);

		//TODO:		5. 	Lưu refresh token hash
		await this.userService.updateToken(user.userId, refreshToken);

		return {
			user: {
				userId: user.userId,
				email: user.email,
				googleName: user.googleName,
				googleAvatarUrl: user.googleAvatarUrl,
				isAdmin: user.isAdmin,
			},
			accessToken,
			refreshToken,
		};
	}
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
	async _handleGetProfile(user: JwtPayloadDto): Promise<ResponseDto<ProfileMeDto>> {
		return new ResponseDto<ProfileMeDto>({
			message: 'Lấy thông tin thành công',
			data: {
				userId: user.sub,
				email: user.email,
				isAdmin: user.isAdmin,
			},
		});
	}
	async _handleUpdateProfile(user: JwtPayloadDto, profileDto: UpdateProfileDto) {
		await this.userService.updateProfile(user.sub, profileDto);
		return new ResponseDto<string>({
			message: 'Cập nhật thông tin người dùng thành công',
		});
	}
	async _handleUpdateTarget(user: JwtPayloadDto, dto: UpdateProfileOnboardingDto) {
		// TODO: nếu muốn, update luôn user_availabilities ở đây

		// TODO: sau khi cập nhật xong, có thể trigger AI generate plan (Core Flow 1)
		// await this.plansService.generateInitialPlan(user.sub);

		// return new ResponseDto<ProfileMeDto>({
		// 	data: {
		// 		userId: user.sub,
		// 		email: user.email,
		// 		profile: {
		// 			fullName: profile.fullName,
		// 			goalType: profile.goalType,
		// 			goalDetail: profile.goalDetail,
		// 			selfCefr: profile.selfCefr,
		// 			targetDate: profile.targetDate,
		// 			studyMinutesPerWeek: profile.studyMinutesPerWeek,
		// 			focusSkills: dto.focusSkills ?? [],
		// 		},
		// 	},
		// });

		return;
	}
}
