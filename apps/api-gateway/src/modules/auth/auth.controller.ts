import { AuthService } from './auth.service';
import { Body, Controller, Delete, Get, Patch, Post } from '@nestjs/common';
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

	//TODO:		AuthenticationsPOST /api/auth/google
	//			POST /api/auth/refresh
	//			POST /api/auth/logout
	//			GET /api/auth/me
	//			PATCH /api/auth/me
	//			DELETE /api/auth/me

	@Public()
	@Post('google')
	@ApiOperation({ summary: 'Đăng nhập/Đăng ký bằng Google' })
	async googleAuth(@Body() googleAuthDto: GoogleAuthDto) {
		return this.authService.googleAuth(googleAuthDto);
	}

	@Public()
	@Post('refresh')
	async refresh(@Body('refreshToken') token: string) {
		return this.authService.refresh(token);
	}

	@Post('logout')
	@ApiOperation({ summary: 'Đăng xuất, xoá refresh token hiện tại' })
	async logout(@ReqUser() user: JwtPayloadDto) {
		await this.authService.logout(user.sub);
		return { success: true };
	}

	@Get('me')
	async me(@ReqUser() user: JwtPayloadDto): Promise<ResponseDto<ProfileMeDto>> {
		return this.authService.getProfile(user.userId);
	}

	@Patch('me')
	@ApiOperation({ summary: 'Cập nhật thông tin cá nhân' })
	async updateProfile(@ReqUser() user: JwtPayloadDto, @Body() profileDto: UpdateProfileDto) {
		return this.authService.updateProfile(user.userId, profileDto);
	}

	@Delete('me')
	async deleteAccount(@ReqUser() user: JwtPayloadDto) {
		return this.authService.deleteAccount(user.sub);
	}
}
