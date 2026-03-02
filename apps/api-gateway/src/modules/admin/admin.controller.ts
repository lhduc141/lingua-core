import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreatePassageDto } from './dto/create-passage.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreatePracticeSessionDto } from './dto/create-practice-session.dto';
import { BulkImportDictionaryDto } from './dto/bulk-import-dictionary.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
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

	@Post('passages')
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({ summary: 'Tạo passage mới' })
	@ApiResponse({ status: 201, description: 'Passage created successfully' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	async createPassage(@Body() dto: CreatePassageDto) {
		const data = await this.adminService.createPassage(dto);
		return ResponseDto.success(Object, data, 'Passage created successfully', HttpStatus.CREATED);
	}

	@Post('questions')
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({ summary: 'Tạo question mới' })
	@ApiResponse({ status: 201, description: 'Question created successfully' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	async createQuestion(@Body() dto: CreateQuestionDto) {
		const data = await this.adminService.createQuestion(dto);
		return ResponseDto.success(Object, data, 'Question created successfully', HttpStatus.CREATED);
	}

	@Post('lessons')
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({ summary: 'Tạo lesson mới' })
	@ApiResponse({ status: 201, description: 'Lesson created successfully' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	async createLesson(@Body() dto: CreateLessonDto) {
		const data = await this.adminService.createLesson(dto);
		return ResponseDto.success(Object, data, 'Lesson created successfully', HttpStatus.CREATED);
	}

	@Post('practice-sessions')
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({ summary: 'Tạo practice session mới' })
	@ApiResponse({ status: 201, description: 'Practice session created successfully' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	async createPracticeSession(@Body() dto: CreatePracticeSessionDto) {
		const data = await this.adminService.createPracticeSession(dto);
		return ResponseDto.success(Object, data, 'Practice session created successfully', HttpStatus.CREATED);
	}

	@Post('dictionary/import')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Bulk import dictionary từ CSV/JSON' })
	@ApiResponse({ status: 200, description: 'Import completed' })
	@ApiResponse({ status: 400, description: 'Invalid format or data' })
	async bulkImportDictionary(@Body() dto: BulkImportDictionaryDto) {
		const data = await this.adminService.bulkImportDictionary(dto);
		return ResponseDto.success(Object, data, 'Dictionary import completed');
	}

	@Get('users')
	@ApiOperation({ summary: 'Lấy danh sách users' })
	@ApiResponse({ status: 200, description: 'Users retrieved successfully' })
	async listUsers(@Query() query: ListUsersQueryDto) {
		const data = await this.adminService.listUsers(query);
		return ResponseDto.success(Object, data, 'Users retrieved successfully');
	}

	@Get('stats')
	@ApiOperation({ summary: 'Lấy thống kê hệ thống' })
	@ApiResponse({ status: 200, description: 'System stats retrieved successfully' })
	async getSystemStats() {
		const data = await this.adminService.getSystemStats();
		return ResponseDto.success(Object, data, 'System stats retrieved successfully');
	}
}
