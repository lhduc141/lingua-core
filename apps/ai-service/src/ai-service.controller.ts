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
	async gradeSubmission(
		@Payload()
		payload: {
			questionType: string;
			userText: string;
			stemText?: string;
			cefrLevel?: string;
			minWords?: number;
			maxWords?: number;
			aiTraceId?: string;
		},
	) {
		return this.aiService.gradeSubmission(payload);
	}

	// Learning Plan
	@MessagePattern('ai.plan.select-content')
	async selectPlanContent(@Payload() payload: any) {
		return this.aiService.selectPlanContent(payload);
	}

	@MessagePattern('ai.plan.generate')
	async generatePlanItems(@Payload() payload: any) {
		return this.aiService.generatePlanItems(payload);
	}

	@MessagePattern('ai.plan.weekly-review')
	async generateWeeklyReview(@Payload() payload: any) {
		return this.aiService.generateWeeklyReview(payload);
	}

	@MessagePattern('ai.audio.transcribe')
	async transcribeAudio(@Payload() payload: { buffer: Buffer; mimetype: string; originalname: string }) {
		return this.aiService.transcribeAudio(payload);
	}

	@MessagePattern('ai.pronunciation.assess')
	assessPronunciation(@Payload() payload: any) {
		return this.aiService.assessPronunciation(payload);
	}
}