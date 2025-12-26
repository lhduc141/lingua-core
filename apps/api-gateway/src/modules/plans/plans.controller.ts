import { Controller, Get, Patch, Post } from '@nestjs/common';
import { PlansService } from './plans.service';

@Controller('plans')
export class PlansController {
	constructor(private readonly plansService: PlansService) {}

	@Get('')
	async getLearningPlan() {}

	@Post('generate')
	async generateLearningPlan() {}

	@Get('items')
	async listPlanItems() {}

	@Patch('items/:id/complete')
	async completePlanItem() {}
}
