import { Controller, Get, Post } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';

@Controller('assessments')
export class AssessmentsController {
	constructor(private readonly assessmentsService: AssessmentsService) {}

	@Post('start')
	async startAssessment() {}

	@Post(':assessmentId/submit')
	async submitAssessment() {}

	@Get(':assessmentId')
	async getAssessment() {}

	@Get(':assessmentId/attempts')
	async listAttempts() {}

	@Get('attempts/:attemptId')
	async getAttempt() {}
}
