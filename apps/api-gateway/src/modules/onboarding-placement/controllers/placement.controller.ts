import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Placement Test')
@Controller('placement')
export class PlacementController {
	@Post('start')
	async postPlacementTestStart() {}

	@Post('answer')
	async postPlacementTestAnswer() {}

	@Post('complete')
	async postPlacementTestComplete() {}

	@Get('result')
	async getResult() {}
}
