import { Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { ExamsService } from './exams.service';

@Controller('exams')
export class ExamsController {
	constructor(private readonly examsService: ExamsService) {}

	//	Exams

	@Get('exams')
	async listExams() {}

	@Post('exams')
	async createExam() {}

	@Get('exams/:id')
	async getExam() {}

	@Patch('exams/:id')
	async updateExam() {}

	@Delete('exams/:id')
	async deleteExam() {}

	//	Exam Sections

	@Post('exams/:examId/sections')
	async createSection() {}

	@Get('sections/:id')
	async getSection() {}

	@Patch('sections/:id')
	async updateSection() {}

	@Delete('sections/:id')
	async deleteSection() {}

	//	Section Questions

	@Post('sections/:sectionId/questions')
	async addQuestionToSection() {}

	@Delete('section-questions/:id')
	async removeSectionQuestion() {}
}
