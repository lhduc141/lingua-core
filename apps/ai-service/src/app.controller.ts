import { Controller } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller('ai-service')
export class AppController {
	constructor(private readonly aiService: AppService) {}

	@MessagePattern('ai.ask')
	async handleAsk(@Payload() prompt: string) {
		return await this.aiService.ask(prompt);
	}
}
