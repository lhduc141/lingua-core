import { Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { CmsService } from './cms.service';

@Controller('cms')
export class CmsController {
	constructor(private readonly cmsService: CmsService) {}

	//TODO: Topics
	@Get('topics')
	async getTopics() {}

	@Post('topics')
	async createTopic() {}

	@Get('topics/:id')
	async getTopic() {}

	@Patch('topics/:id')
	async updateTopic() {}

	@Delete('topics/:id')
	async deleteTopic() {}

	//TODO:	Lessons
	@Get('lessons')
	async getLessons() {}

	@Post('lessons')
	async createLesson() {}

	@Get('lessons/:id')
	async getLesson() {}

	@Patch('lessons/:id')
	async updateLesson() {}

	@Delete('lessons/:id')
	async deleteLesson() {}

	//TODO:	Questions

	@Get('questions')
	async getQuestions() {}

	@Post('questions')
	async createQuestion() {}

	@Get('questions/:id')
	async getQuestion() {}

	@Patch('questions/:id')
	async updateQuestion() {}

	@Delete('questions/:id')
	async deleteQuestion() {}

	//TODO:	Question Options
	@Post('questions/:id/options')
	async addOption() {}

	@Patch('options/:id')
	async updateOption() {}

	@Delete('options/:id')
	async deleteOption() {}
}
