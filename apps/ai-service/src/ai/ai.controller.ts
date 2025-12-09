// apps/ai-service/src/ai/ai.controller.ts
import { Body, Controller, Get, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { CEFREvaluationDto, CEFRRequestDto } from './dto/ai.dto';

@Controller('ai')
export class AiController {
	constructor(private readonly aiService: AiService) {}

	@Get('health')
	health() {
		return { status: 'ok' };
	}

	@Post('placement/cefr')
	async cefr(@Body() body: CEFRRequestDto): Promise<CEFREvaluationDto> {
		return this.aiService.evaluateCEFR(body);
	}
}
