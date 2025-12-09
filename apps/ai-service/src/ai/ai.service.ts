// apps/ai-service/src/ai/ai.service.ts
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { CEFRBandDto, CEFREvaluationDto, CEFRRequestDto } from './dto/ai.dto';

@Injectable()
export class AiService {
	// đọc từ env giống Python
	private readonly apiBase = process.env.LLM_API_BASE || 'http://localhost:11434/v1';
	private readonly model = process.env.LLM_MODEL || 'my-cefr-model';
	private readonly apiKey = process.env.LLM_API_KEY || 'EMPTY';

	// ===== HÀM CHÍNH: GỌI OLLAMA + FALLBACK =====
	async evaluateCEFR(req: CEFRRequestDto): Promise<CEFREvaluationDto> {
		const { system, user } = this.buildPrompt(req);

		try {
			const resp = await axios.post(
				`${this.apiBase}/chat/completions`,
				{
					model: this.model,
					messages: [
						{ role: 'system', content: system },
						{ role: 'user', content: user },
					],
					temperature: 0.3,
					max_tokens: 1024,
				},
				{
					headers: {
						Authorization: `Bearer ${this.apiKey}`,
						'Content-Type': 'application/json',
					},
					timeout: 60000,
				},
			);

			const raw: string = resp.data?.choices?.[0]?.message?.content ?? '';
			console.log('=== RAW LLM OUTPUT ===');
			console.log(raw);
			console.log('======================');

			let data: any = {};
			try {
				const jsonText = this.extractJson(raw);
				data = JSON.parse(jsonText);
			} catch (e) {
				console.warn('[WARN] Cannot parse LLM JSON, using heuristic:', e);
				return this.heuristicFromScores(req);
			}

			const hasFull =
				data && typeof data === 'object' && 'overall_level' in data && 'summary' in data && 'bands' in data;

			if (!hasFull) {
				console.info('[INFO] LLM JSON missing fields, using heuristic.');
				return this.heuristicFromScores(req);
			}

			const strengths: string[] = data.strengths ?? [];
			const weaknesses: string[] = data.weaknesses ?? [];
			const bands: CEFRBandDto[] = data.bands ?? [];

			return {
				overall_level: data.overall_level,
				summary: data.summary,
				strengths,
				weaknesses,
				bands,
			};
		} catch (err: any) {
			console.error('Error calling LLM:', err?.message || err);
			// fallback cho chắc
			return this.heuristicFromScores(req);
		}
	}

	// ===== PROMPT GIỐNG PYTHON =====
	private buildPrompt(req: CEFRRequestDto): { system: string; user: string } {
		const sectionText = req.section_scores.map((s) => `- ${s.section}: ${s.score} / ${s.max_score}`).join('\n');

		const onboardingText = `
Goal: ${req.onboarding.main_goal}
Target months: ${req.onboarding.target_months}
Hours per week: ${req.onboarding.hours_per_week}
Priority skills: ${req.onboarding.priority_skills.join(', ')}
Self-assessed level: ${req.onboarding.self_assessed_level ?? 'N/A'}
Difficulties: ${req.onboarding.difficulties.join(', ') || 'N/A'}
`.trim();

		const system = `
You are an English language placement evaluator.

Your task:
- Read the student's placement scores, onboarding profile and writing sample.
- Decide their CEFR level (A1, A2, B1, B2, C1, or C2).
- Explain briefly why.
- Identify strengths and weaknesses.
- Give per-skill bands.

OUTPUT FORMAT (VERY IMPORTANT):
Return ONE JSON object with EXACTLY this structure:

{
  "overall_level": "A1|A2|B1|B2|C1|C2",
  "summary": "short overall summary of the student's level and situation",
  "strengths": ["sentence 1", "sentence 2"],
  "weaknesses": ["sentence 1", "sentence 2"],
  "bands": [
    {
      "skill": "vocabulary|grammar|reading|writing|listening|speaking",
      "level": "A1|A2|B1|B2|C1|C2",
      "score": 0,
      "comment": "short comment about this skill"
    }
  ]
}

RULES (CRITICAL):
- Return ONLY valid JSON. No markdown, no \`\`\` fences, no extra text.
- Do NOT include the input again.
- Do NOT include fields other than: overall_level, summary, strengths, weaknesses, bands.
- All numbers MUST be plain numbers (e.g. 18 or 18.0). NEVER use expressions like 18/25 or 18.0/25.0.
- Use double quotes for all strings (standard JSON).
- Make sure the JSON can be parsed by a strict JSON parser.
`.trim();

		const user = `
Placement scores:
${sectionText}

Onboarding profile:
${onboardingText}

Writing sample:
"""${req.writing_text}"""

Now produce the JSON evaluation as specified above.
Remember:
- ONLY return the JSON object.
- NO markdown.
- NO backticks.
- NO comments outside JSON.
`.trim();

		return { system, user };
	}

	// ===== CẮT JSON ĐẦU TIÊN TỪ OUTPUT CỦA MODEL (copy từ Python) =====
	private extractJson(text: string): string {
		text = text.trim();
		let start: number | null = null;
		let depth = 0;
		let inString = false;
		let escape = false;

		for (let i = 0; i < text.length; i++) {
			const ch = text[i];

			if (ch === '"' && !escape) {
				inString = !inString;
			}

			if (inString) {
				escape = ch === '\\' && !escape;
				continue;
			} else {
				escape = false;
			}

			if (ch === '{') {
				if (depth === 0) {
					start = i;
				}
				depth++;
			} else if (ch === '}') {
				if (depth > 0) {
					depth--;
					if (depth === 0 && start !== null) {
						return text.slice(start, i + 1);
					}
				}
			}
		}

		throw new Error('No JSON object found in LLM output');
	}

	// ===== HEURISTIC FALLBACK – copy logic từ Python =====
	private heuristicFromScores(req: CEFRRequestDto): CEFREvaluationDto {
		const ratios = req.section_scores?.length
			? req.section_scores.filter((s) => s.max_score).map((s) => s.score / s.max_score)
			: [];

		const avgRatio = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0;

		const ratioToLevel = (r: number): string => {
			if (r < 0.2) return 'A1';
			if (r < 0.4) return 'A2';
			if (r < 0.6) return 'B1';
			if (r < 0.75) return 'B2';
			if (r < 0.9) return 'C1';
			return 'C2';
		};

		const overallLevel = ratioToLevel(avgRatio);
		const summary = `Based on placement scores (average ratio ${avgRatio.toFixed(
			2,
		)}), the estimated level is ${overallLevel}.`;

		const strengths: string[] = [];
		const weaknesses: string[] = [];

		if (req.section_scores?.length) {
			const sorted = [...req.section_scores].sort(
				(a, b) => b.score / (b.max_score || 1) - a.score / (a.max_score || 1),
			);
			const best = sorted[0];
			const worst = sorted[sorted.length - 1];

			strengths.push(`Stronger skill in ${best.section} with ${best.score}/${best.max_score}.`);
			weaknesses.push(`Needs improvement in ${worst.section} with ${worst.score}/${worst.max_score}.`);
		}

		const bands: CEFRBandDto[] =
			req.section_scores?.map((s) => {
				const ratio = s.score / (s.max_score || 1);
				const lvl = ratioToLevel(ratio);
				return {
					skill: s.section,
					level: lvl,
					score: s.score,
					comment: `${s.section} is around ${lvl} level with score ${s.score}/${s.max_score}.`,
				};
			}) ?? [];

		return {
			overall_level: overallLevel,
			summary,
			strengths,
			weaknesses,
			bands,
		};
	}
}
