import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../guards/auth.guard';
import { ReqUser } from '../../decorators/req-user.decorator';
import { DashboardService } from './dashboard.service';
import { GetStudyTimeDto } from './dto/get-study-time.dto';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class DashboardController {
	constructor(private readonly dashboardService: DashboardService) {}

	@Get('overview')
	@ApiOperation({ summary: 'Tổng quan dashboard: CEFR level, plan progress, skill summary, streak, vocabulary' })
	@ApiOkResponse({ description: 'Dashboard overview data' })
	getOverview(@ReqUser('userId') userId: string) {
		return this.dashboardService.getOverview(userId);
	}

	@Get('streak')
	@ApiOperation({ summary: 'Streak hiện tại, dài nhất, và activity calendar 30 ngày' })
	@ApiOkResponse({ description: 'Streak and activity calendar data' })
	getStreak(@ReqUser('userId') userId: string) {
		return this.dashboardService.getStreak(userId);
	}

	@Get('study-time')
	@ApiOperation({ summary: 'Thời gian học theo period (week/month/all)' })
	@ApiOkResponse({ description: 'Study time breakdown' })
	getStudyTime(@ReqUser('userId') userId: string, @Query() dto: GetStudyTimeDto) {
		return this.dashboardService.getStudyTime(userId, dto);
	}

	@Get('skills/:skillName/progress')
	@ApiOperation({ summary: 'Tiến độ chi tiết 1 skill: avg score, trend, score history, plan items' })
	@ApiOkResponse({ description: 'Skill progress data' })
	getSkillProgress(
		@ReqUser('userId') userId: string,
		@Param('skillName') skillName: string,
	) {
		return this.dashboardService.getSkillProgress(userId, skillName);
	}
}
