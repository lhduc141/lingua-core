import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class AiClientService {
	constructor(@Inject('AI_SERVICE') private readonly client: ClientProxy) {}

	evaluateSurvey(payload: any) {
		return lastValueFrom(this.client.send('ai.survey.evaluate', payload));
	}

	placementCEFR(payload: any) {
		return lastValueFrom(this.client.send('ai.placement.cefr', payload));
	}

	generatePlan(payload: any) {
		return lastValueFrom(this.client.send('ai.plan.generate', payload));
	}

	dictionaryLookup(payload: any) {
		return lastValueFrom(this.client.send('ai.dictionary.lookup', payload));
	}

	writingGrade(payload: any) {
		return lastValueFrom(this.client.send('ai.writing.grade', payload));
	}

	gradeSubmission(payload: { questionType: string; userText: string }) {
		return lastValueFrom(this.client.send('ai.grading.evaluate', payload));
	}
}
