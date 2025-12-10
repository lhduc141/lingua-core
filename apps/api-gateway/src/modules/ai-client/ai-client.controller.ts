import { Body, Controller, Post } from '@nestjs/common';
import { AiClientService } from './ai-client.service';
import { Public } from '../../decorators/public.decorator';

@Controller('ai-client')
export class AiClientController {
	constructor(private readonly aiClientService: AiClientService) {}

	@Post('ask')
	@Public()
	async ask(@Body('prompt') prompt: string) {
		const answer = await this.aiClientService.ask(prompt);
		return { answer };
	}
}
