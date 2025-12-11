import { Controller } from '@nestjs/common';
import { AiServiceService } from './ai-service.service';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller('ai-service')
export class AiServiceController {
	constructor(private readonly aiService: AiServiceService) {}

	@MessagePattern('ai.ask')
	async handleAsk(@Payload() prompt: string) {
		return await this.aiService.ask(prompt);
	}

	@MessagePattern('survey')
	async evaluateSurvey(@Payload() prompt: any) {
		return await this.aiService.evaluateSurvey(prompt);
	}
}
