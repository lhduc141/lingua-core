import { AuthService } from './auth.service';
import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ApiTag } from '../../decorators/api-tag.decorator';
import { Public } from '../../decorators/public.decorator';
import { ReqUser } from '../../decorators/req-user.decorator';
import type { JwtPayloadDto } from '@app/jwt';
import { ResponseDto } from '@app/shared';
import { ProfileMeDto } from './dto/profile-me.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';

@Controller('auth')
@ApiTag({
	name: 'Auth',
	description: 'Quản lý thông tin tài khoản',
})
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Public()
	@Post('google')
	@ApiOperation({ summary: 'Đăng nhập/Đăng ký bằng Google' })
	async googleAuth(@Body() googleAuthDto: GoogleAuthDto) {
		return this.authService.googleAuth(googleAuthDto);
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
		return this.authService.getProfile(user.userId);
	}

	// ========== UPDATE PROFILE (để TODO) ==========
	@Patch('profile')
	@ApiOperation({ summary: 'Cập nhật thông tin cá nhân' })
	async updateProfile(@ReqUser() user: JwtPayloadDto, @Body() profileDto: UpdateProfileDto) {
		return this.authService.updateProfile(user.userId, profileDto);
	}
}
