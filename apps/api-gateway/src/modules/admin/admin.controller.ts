import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreatePassageDto } from './dto/create-passage.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateQuestionSetDto } from './dto/create-question-set.dto';
import { BulkImportDictionaryDto } from './dto/bulk-import-dictionary.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { ListAdminLessonsDto } from './dto/list-admin-lessons.dto';
import { UpdateLessonStatusDto } from './dto/update-lesson-status.dto';
import { ListPlacementSessionsDto } from './dto/list-placement-sessions.dto';
import { ResponseDto } from '@app/shared';
import { CreateQuestionDto } from './dto/create-question.dto';
import { AuthGuard } from '../../guards/auth.guard';
import { AdminGuard } from '../../guards/admin.guard';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller({ path: 'admin', version: '1' })
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
	constructor(private readonly adminService: AdminService) {}

	// ── Content creation ────────────────────────────────────────────
	@Post('passages')
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({ summary: 'Tạo passage mới' })
	async createPassage(@Body() dto: CreatePassageDto) {
		const data = await this.adminService.createPassage(dto);
		return ResponseDto.success(Object, data, 'Passage created successfully', HttpStatus.CREATED);
	}

	@Post('questions')
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({ summary: 'Tạo question mới' })
	async createQuestion(@Body() dto: CreateQuestionDto) {
		const data = await this.adminService.createQuestion(dto);
		return ResponseDto.success(Object, data, 'Question created successfully', HttpStatus.CREATED);
	}

	@Post('lessons')
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({ summary: 'Tạo lesson mới' })
	async createLesson(@Body() dto: CreateLessonDto) {
		const data = await this.adminService.createLesson(dto);
		return ResponseDto.success(Object, data, 'Lesson created successfully', HttpStatus.CREATED);
	}

	@Post('question-sets')
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({ summary: 'Tạo question set mới' })
	async createQuestionSet(@Body() dto: CreateQuestionSetDto) {
		const data = await this.adminService.createQuestionSet(dto);
		return ResponseDto.success(Object, data, 'Practice set created successfully', HttpStatus.CREATED);
	}

	@Post('dictionary/import')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Bulk import dictionary' })
	async bulkImportDictionary(@Body() dto: BulkImportDictionaryDto) {
		const data = await this.adminService.bulkImportDictionary(dto);
		return ResponseDto.success(Object, data, 'Dictionary import completed');
	}

	// ── User management ─────────────────────────────────────────────
	@Get('users')
	@ApiOperation({ summary: 'Danh sách users' })
	async listUsers(@Query() query: ListUsersDto) {
		const data = await this.adminService.listUsers(query);
		return ResponseDto.success(Object, data, 'Users retrieved successfully');
	}

	// ── System stats ────────────────────────────────────────────────
	@Get('stats')
	@ApiOperation({ summary: 'Thống kê hệ thống — users, content, activity, CEFR distribution, skill performance' })
	@ApiResponse({ status: 200, description: 'System stats' })
	async getSystemStats() {
		const data = await this.adminService.getSystemStats();
		return ResponseDto.success(Object, data, 'System stats retrieved successfully');
	}

	@Get('lessons')
	@ApiOperation({ summary: 'Danh sách lessons (admin) — filter skill, cefrLevel, status' })
	async listAdminLessons(@Query() query: ListAdminLessonsDto) {
		return this.adminService.listAdminLessons(query);
	}

	@Patch('lessons/:lessonId/status')
	@ApiOperation({ summary: 'Cập nhật status lesson — published / draft' })
	@ApiResponse({ status: 200, description: 'Lesson status updated' })
	@ApiResponse({ status: 404, description: 'Lesson not found' })
	async updateLessonStatus(@Param('lessonId', ParseUUIDPipe) lessonId: string, @Body() dto: UpdateLessonStatusDto) {
		const data = await this.adminService.updateLessonStatus(lessonId, dto);
		return ResponseDto.success(Object, data, 'Lesson status updated');
	}

	@Get('placement-sessions')
	@ApiOperation({ summary: 'Danh sách placement sessions — validate CAT engine' })
	@ApiResponse({ status: 200, description: 'Placement sessions list' })
	async listPlacementSessions(@Query() query: ListPlacementSessionsDto) {
		return this.adminService.listPlacementSessions(query);
	}
}
