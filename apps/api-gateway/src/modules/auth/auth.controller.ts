import { AuthService } from './auth.service';
import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ApiOperation } from '@nestjs/swagger';
import { ApiTag } from '../../decorators/api-tag.decorator';
import { Public } from '../../decorators/public.decorator';
import { ReqUser } from '../../decorators/req-user.decorator';
import type { JwtPayloadDto } from '@app/jwt';
import { ResponseDto } from '@app/shared';
import { ProfileMeDto } from './dto/profile-me.dto';
import { UpdateProfileOnboardingDto } from './dto/update-profile-onboarding.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('auth')
@ApiTag({
	name: 'Auth',
	description: 'Quản lý thông tin tài khoản',
})
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	// ========== SIGNUP ==========
	@Public()
	@Post('signup')
	@ApiOperation({ summary: 'Đăng ký tài khoản mới' })
	async signup(@Body() signupDto: SignupDto) {
		return this.authService.signup(signupDto);
	}

	// ========== LOGIN ==========
	@Public()
	@Post('login')
	@ApiOperation({ summary: 'Đăng nhập' })
	async login(@Body() loginDto: LoginDto) {
		return this.authService.login(loginDto);
	}

	// ========== REFRESH TOKEN ==========
	@Public()
	@Post('refresh')
	async refresh(@Body('refreshToken') token: string) {
		return this.authService.refresh(token);
	}

	// ========== LOGOUT ==========
	@Post('logout')
	@ApiOperation({ summary: 'Đăng xuất, xoá refresh token hiện tại' })
	async logout(@ReqUser() user: JwtPayloadDto) {
		await this.authService.logout(user.sub);
		return { success: true };
	}

	// ========== ME ==========
	@Get('me')
	async me(@ReqUser() user: JwtPayloadDto): Promise<ResponseDto<ProfileMeDto>> {
		return this.authService.getProfile(user);
	}

	// ========== UPDATE PROFILE (để TODO) ==========
	@Patch('profile')
	@ApiOperation({ summary: 'Cập nhật thông tin cá nhân' })
	async updateProfile(@ReqUser() user: JwtPayloadDto, @Body() profileDto: UpdateProfileDto) {
		return this.authService.updateProfile(user, profileDto);
	}

	@Patch('target')
	@ApiOperation({ summary: 'Thông tin học tập' })
	async updateTarget(@ReqUser() user: JwtPayloadDto, @Body() dto: UpdateProfileOnboardingDto) {
		return this.authService.updateTarget(user, dto);
	}
}
