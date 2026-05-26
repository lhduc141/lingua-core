import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ApiGatewayService {
	constructor(private readonly prisma: PrismaService) {}

	async checkExternalServices() {
		const [groq, azure] = await Promise.allSettled([this.checkGroq(), this.checkAzure()]);

		return {
			timestamp: new Date().toISOString(),
			groq: groq.status === 'fulfilled' ? groq.value : { ok: false, error: groq.reason?.message },
			azure: azure.status === 'fulfilled' ? azure.value : { ok: false, error: azure.reason?.message },
		};
	}

	private async checkGroq() {
		const key = process.env.GROQ_API_KEY;
		if (!key) return { ok: false, error: 'GROQ_API_KEY not set' };

		const res = await fetch('https://api.groq.com/openai/v1/models', {
			headers: { Authorization: `Bearer ${key}` },
		});
		return { ok: res.ok, status: res.status };
	}

	private async checkAzure() {
		const key = process.env.AZURE_SPEECH_KEY;
		const region = process.env.AZURE_SPEECH_REGION;
		if (!key || !region) return { ok: false, error: 'Azure credentials not set' };

		const res = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
			method: 'POST',
			headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Length': '0' },
		});
		return { ok: res.ok, status: res.status };
	}
}
