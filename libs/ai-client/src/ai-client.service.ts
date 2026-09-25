import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
import { PronunciationScores } from '@app/shared';

@Injectable()
export class AiClientService {
	constructor(@Inject('AI_SERVICE') private readonly client: ClientProxy) {}

	evaluateSurvey(payload: any) {
		return lastValueFrom(this.client.send('ai.survey.evaluate', payload));
	}

	placementCEFR(payload: any) {
		return lastValueFrom(this.client.send('ai.placement.cefr', payload));
	}

	selectPlanContent(payload: any) {
		return lastValueFrom(this.client.send('ai.plan.select-content', payload).pipe(timeout(200000)));
	}

	generatePlan(payload: any) {
		return lastValueFrom(this.client.send('ai.plan.generate', payload).pipe(timeout(200000)));
	}

	dictionaryLookup(payload: any) {
		return lastValueFrom(this.client.send('ai.dictionary.lookup', payload));
	}

	writingGrade(payload: any) {
		return lastValueFrom(this.client.send('ai.writing.grade', payload));
	}

	gradeSubmission(payload: {
		questionType: string;
		userText: string;
		stemText?: string;
		cefrLevel?: string;
		minWords?: number;
		maxWords?: number;
		aiTraceId?: string;
	}) {
		return lastValueFrom(this.client.send('ai.grading.evaluate', payload));
	}

	generateWeeklyReview(payload: any) {
		return lastValueFrom(this.client.send('ai.plan.weekly-review', payload));
	}

	transcribeAudio(payload: { buffer: Buffer; mimetype: string; originalname: string }) {
		return lastValueFrom(this.client.send('ai.audio.transcribe', payload));
	}

	assessPronunciation(payload: {
		buffer: Buffer | { type: 'Buffer'; data: number[] } | number[] | Uint8Array;
		mimetype: string;
		referenceText: string;
	}): Promise<PronunciationScores | null> {
		return lastValueFrom(this.client.send('ai.pronunciation.assess', payload));
	}
}