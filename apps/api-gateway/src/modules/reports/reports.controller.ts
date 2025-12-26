import { Controller, Get, Post } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
	constructor(private readonly reportsService: ReportsService) {}

	@Get('reports/:assessmentId')
	async getAssessmentReport() {}

	@Post('reports/:assessmentId/regenerate')
	async regenerateReport() {}
}
