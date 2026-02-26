import { Controller } from '@nestjs/common';
import { AiServiceService } from './ai-service.service';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller('ai-service')
export class AiServiceController {
	constructor(private readonly aiService: AiServiceService) {}

	@MessagePattern('ai.ask')
	async handleAsk(@Payload() prompt: string) {
		return this.aiService.ask(prompt);
	}

	@MessagePattern('ai.survey.evaluate')
	async evaluateSurvey(@Payload() payload: any) {
		return this.aiService.evaluateSurvey(payload);
	}

	@MessagePattern('ai.dictionary.lookup')
	async dictionaryLookup(@Payload() payload: { word: string }) {
		return this.aiService.generateDictionaryEntry(payload.word);
	}

	// Grading
	@MessagePattern('ai.grading.evaluate')
	async gradeSubmission(@Payload() payload: { questionType: string; userText: string }) {
		return this.aiService.gradeSubmission(payload.questionType, payload.userText);
	}
}
