// app.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AppService {
	private genAI: GoogleGenerativeAI;
	private model: GenerativeModel;

	constructor(private configService: ConfigService) {
		const geminiKey = this.configService.get<string>('LLM_API_KEY');
		if (!geminiKey) throw new Error('GEMINI_API_KEY is not defined in .env file');

		this.genAI = new GoogleGenerativeAI(geminiKey);
		this.model = this.genAI.getGenerativeModel({
			model: this.configService.get<string>('LLM_MODEL') || 'gemini-flash-latest',
			generationConfig: {
				maxOutputTokens: 6000,
				temperature: 0.7,
			},
		});
	}

	async ask(prompt: string): Promise<string> {
		try {
			const result = await this.model.generateContent(prompt);
			const response = await result.response;

			return response.text();
		} catch (error) {
			return `Error: ${error.message}`;
		}
	}
}
