import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class AiClientService {
	constructor(@Inject('AI_SERVICE') private readonly aiServiceClient: ClientProxy) {}

	async ask(prompt: string) {
		return await lastValueFrom(this.aiServiceClient.send('ai.ask', prompt));
	}
}
