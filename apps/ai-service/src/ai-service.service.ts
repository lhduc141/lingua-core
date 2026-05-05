import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiDictionaryOutput } from '../../api-gateway/src/modules/dictionary/interface/ai-dictionary-output.interface';
import { Groq } from 'groq-sdk';

@Injectable()
export class AiServiceService {
	RETRY_DELAYS = [2000, 5000, 10000];

	private readonly MODELS = ['llama-3.3-70b-versatile', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

	private readonly logger = new Logger(AiServiceService.name);
	private readonly groqClients: Groq[];

	constructor(private configService: ConfigService) {
		const keys = [
			configService.get<string>('GROQ_API_KEY'),
			configService.get<string>('GROQ_API_KEY_2'),
			configService.get<string>('GROQ_API_KEY_3'),
		].filter(Boolean) as string[];

		if (keys.length === 0) throw new Error('No GROQ API keys defined');

		this.groqClients = keys.map((k) => new Groq({ apiKey: k }));
		this.logger.log(`AI Service initialized | keys=${keys.length} | models=${this.MODELS.length}`);
	}

	async ask(prompt: string): Promise<string> {
		try {
			return await this.callGroq(prompt);
		} catch (error) {
			return `Error: ${error.message}`;
		}
	}

	async evaluateSurvey(survey: any) {
		const prompt = this.buildSurveyPrompt(survey);

		try {
			const raw = await this.callGroq(prompt, true);

			try {
				return JSON.parse(this.cleanJson(raw));
			} catch {
				return {
					user_profile_summary: 'Unknown',
					estimated_level: 'Unknown',
					strengths: [],
					weaknesses: [],
					risk_factors: [],
					study_advice: [],
					recommended_focus_next_two_weeks: [],
					_raw: raw,
				};
			}
		} catch (error) {
			return { error: true, message: error.message };
		}
	}

	async generateDictionaryEntry(word: string): Promise<AiDictionaryOutput> {
		const prompt = this.buildDictionaryPrompt(word);
		const raw = await this.callGroq(prompt, true);
		return JSON.parse(this.cleanJson(raw)) as AiDictionaryOutput;
	}

	async gradeSubmission(questionType: string, userText: string) {
		const prompt = this.buildGradingPrompt(questionType, userText);
		const raw = await this.callGroq(prompt, true);
		return JSON.parse(this.cleanJson(raw));
	}

	async generatePlanItems(payload: any) {
		const prompt = this.buildPlanGenerationPrompt(payload);

		this.logger.log(
			`[generatePlan] week=${payload.weekStartDate}..${payload.weekEndDate} availableDays=${JSON.stringify(
				payload.goals?.availableDays ?? [],
			)} focusSkills=${JSON.stringify(payload.goals?.focusSkills ?? [])} planSkills=${JSON.stringify(
				payload.goals?.planSkills ?? [],
			)}`,
		);

		this.logger.debug(`[generatePlan] PROMPT:\n${prompt}`);

		const raw = await this.callGroq(prompt, true);
		this.logger.log(`[generatePlan] RAW RESPONSE:\n${raw.substring(0, 1000)}`);

		const clean = this.cleanJson(raw);

		try {
			return JSON.parse(clean);
		} catch (err) {
			this.logger.error(`JSON parse failed. Raw response: ${raw.substring(0, 500)}`);
			throw new Error(`Invalid JSON from AI: ${err.message}`);
		}
	}

	async generateWeeklyReview(payload: any) {
		const prompt = this.buildWeeklyReviewPrompt(payload);
		const raw = await this.callGroq(prompt, true);

		try {
			return JSON.parse(this.cleanJson(raw));
		} catch {
			return {
				summary: 'Weekly review could not be parsed.',
				completionRate:
					payload.totalTasks > 0 ? Math.round((payload.completedTasks / payload.totalTasks) * 100) : 0,
				skillBreakdown: {},
				recommendations: [],
				_raw: raw,
			};
		}
	}

	async transcribeAudio(payload: {
		buffer: Buffer | { type: 'Buffer'; data: number[] } | number[] | Uint8Array;
		mimetype: string;
		originalname: string;
	}) {
		const client = this.groqClients[0];

		const audioBuffer = this.normalizeAudioBuffer(payload.buffer);

		const arrayBuffer = audioBuffer.buffer.slice(
			audioBuffer.byteOffset,
			audioBuffer.byteOffset + audioBuffer.byteLength,
		) as ArrayBuffer;

		const file = new File([arrayBuffer], payload.originalname || 'audio.webm', {
			type: payload.mimetype || 'audio/webm',
		});

		const result = await client.audio.transcriptions.create({
			file,
			model: 'whisper-large-v3',
			response_format: 'json',
		});

		return result.text;
	}

	private normalizeAudioBuffer(input: any): Buffer {
		if (Buffer.isBuffer(input)) {
			return input;
		}

		if (input instanceof Uint8Array) {
			return Buffer.from(input);
		}

		if (Array.isArray(input)) {
			return Buffer.from(input);
		}

		if (input?.type === 'Buffer' && Array.isArray(input.data)) {
			return Buffer.from(input.data);
		}

		if (input?.data && Array.isArray(input.data)) {
			return Buffer.from(input.data);
		}

		throw new Error('Invalid audio buffer payload');
	}

	private async callGroq(prompt: string, jsonMode = false): Promise<string> {
		let lastError: any;

		for (let i = 0; i < this.groqClients.length; i++) {
			const client = this.groqClients[i];
			const model = this.MODELS[i] ?? this.MODELS[0];

			try {
				const res = await client.chat.completions.create({
					model,
					messages: [{ role: 'user', content: prompt }],
					temperature: jsonMode ? 0.2 : 0.7,
					response_format: jsonMode ? { type: 'json_object' } : undefined,
				});

				return res.choices[0]?.message?.content ?? '';
			} catch (err) {
				lastError = err;
				this.logger.warn(`Groq call failed | model=${model} | keyIndex=${i} | error=${err.message}`);

				const delay = this.RETRY_DELAYS[i] ?? 1000;
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}

		throw lastError;
	}

	private cleanJson(raw: string): string {
		return raw
			.trim()
			.replace(/^```json\s*/i, '')
			.replace(/^```\s*/i, '')
			.replace(/```$/i, '')
			.trim();
	}

	private buildSurveyPrompt(survey: any): string {
		return `You are LinguaPanda AI Tutor.

Analyze this learner onboarding survey and return a concise JSON profile.

SURVEY:
${JSON.stringify(survey, null, 2)}

Respond ONLY with valid JSON:
{
  "user_profile_summary": "short summary",
  "estimated_level": "beginner|elementary|intermediate|advanced",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "risk_factors": ["..."],
  "study_advice": ["..."],
  "recommended_focus_next_two_weeks": ["reading","writing","speaking"]
}`;
	}

	private buildDictionaryPrompt(word: string): string {
		return `You are an expert English dictionary system for Vietnamese learners (A1-B2 CEFR).

Generate a complete dictionary entry for the word: "${word}"

IMPORTANT RULES:
1. Always identify and return the ROOT form as headword (e.g. if given "happiness", return headword "happy")
2. Include all word forms derived from this root in wordForms array
3. Return maximum 3 senses, ordered from most common to least common
4. For each sense, include maximum 5 collocations
5. Keep definitions clear and suitable for A1-B2 learners
6. Vietnamese translations (viDefinition, viText, viMeaning) are required

Respond ONLY with valid JSON, no markdown, no explanation:

{
  "headword": "happy",
  "ipa": "/ˈhæpi/",
  "pos": "adjective",
  "cefrLevel": "A2",
  "wordForms": [
    { "form": "happiness", "pos": "noun" },
    { "form": "happily", "pos": "adverb" },
    { "form": "unhappy", "pos": "adjective" }
  ],
  "senses": [
    {
      "definition": "feeling or showing pleasure and contentment",
      "viDefinition": "cảm thấy vui vẻ, hạnh phúc",
      "examples": [
        {
          "text": "She was happy to see her friends.",
          "viText": "Cô ấy vui khi gặp bạn bè."
        }
      ],
      "synonyms": ["joyful", "glad", "pleased"],
      "antonyms": ["sad", "unhappy", "miserable"],
      "collocations": [
        {
          "phrase": "happy ending",
          "meaning": "a conclusion where everything works out well",
          "viMeaning": "kết thúc có hậu",
          "example": "Every fairy tale has a happy ending."
        }
      ]
    }
  ]
}`;
	}

	// PATCH 4A: thêm case dictation với criteria riêng
	private buildGradingPrompt(questionType: string, userText: string): string {
		const isDictation = questionType === 'dictation';

		const typeLabel =
			questionType === 'speaking'
				? 'spoken response transcript'
				: isDictation
					? 'dictation response'
					: 'writing response';

		const criteria = isDictation
			? `- Spelling accuracy
- Word accuracy
- Punctuation accuracy
- Completeness`
			: `- Grammar accuracy
- Vocabulary range
- Coherence and cohesion
- Task achievement`;

		const dimensionExample = isDictation
			? `{ "name": "Spelling", "score": 7, "comment": "..." },
    { "name": "Word Accuracy", "score": 8, "comment": "..." },
    { "name": "Punctuation", "score": 7.5, "comment": "..." },
    { "name": "Completeness", "score": 7.5, "comment": "..." }`
			: `{ "name": "Grammar", "score": 7, "comment": "..." },
    { "name": "Vocabulary", "score": 8, "comment": "..." },
    { "name": "Coherence", "score": 7.5, "comment": "..." },
    { "name": "Task Achievement", "score": 7.5, "comment": "..." }`;

		const suggestionExample = isDictation
			? `"Listen carefully to word endings and punctuation.",
    "Practice spelling commonly confused words."`
			: `"Practice using more complex sentence structures.",
    "Review subject-verb agreement."`;

		return `You are an English teacher.

Grade the following ${typeLabel} and provide detailed feedback.

USER TEXT:
"${userText}"

SCORING CRITERIA:
${criteria}

RULES:
1. overallScore: 0-10, integer or .5 steps.
2. dimensions: exactly 4 criteria with name, score, comment.
3. corrections: up to 5 specific errors.
4. suggestions: 2-3 actionable improvement tips.
5. Respond ONLY with valid JSON.

JSON format:
{
  "overallScore": 7.5,
  "dimensions": [
    ${dimensionExample}
  ],
  "corrections": [
    {
      "original": "She go to school every day",
      "corrected": "She goes to school every day",
      "rule": "Third person singular present simple requires -s/-es"
    }
  ],
  "suggestions": [
    ${suggestionExample}
  ]
}`;
	}

	// PATCH 4B: xóa 2 dòng cấm listening, đánh số lại rules
	private buildPlanGenerationPrompt(payload: any): string {
		const {
			cefrLevel,
			goals,
			weekStartDate,
			weekEndDate,
			weekDates,
			skillPerformance,
			compactContent,
			dailyMinutesLimit,
		} = payload;

		const availableDays = goals?.availableDays ?? [];
		const focusSkills = goals?.focusSkills ?? [];
		const planSkills = goals?.planSkills ?? [];
		const plannedStudyHoursPerWeek = goals?.plannedStudyHoursPerWeek || 7;

		const dailyMinutes =
			dailyMinutesLimit ?? Math.ceil((plannedStudyHoursPerWeek / Math.max(availableDays.length || 1, 1)) * 60);

		const perfStr = (skillPerformance ?? []).map((p: any) => `${p.skill}:${p.avg}%`).join(' ') || 'no data yet';

		const weekRangeText = (weekDates ?? []).map((d: any) => `day ${d.day} = ${d.weekday}, ${d.date}`).join('\n');

		return `You are LinguaPanda AI Tutor — adaptive English learning plan generator.

				LEARNER:
				- CEFR level: ${cefrLevel}
				- Priority focus skills: ${JSON.stringify(focusSkills)}
				- Allowed plan skills: ${JSON.stringify(planSkills)}
				- Planned study time: ${plannedStudyHoursPerWeek} hours/week
				- Daily time limit: ${dailyMinutes} minutes
				- Performance: ${perfStr}
				
				CURRENT WEEK:
				- weekStartDate: ${weekStartDate}
				- weekEndDate: ${weekEndDate}
				
				WEEK RANGE:
				${weekRangeText}
				
				AVAILABLE DAYS:
				${JSON.stringify(availableDays)}
				
				AVAILABLE CONTENT:
				Format: CEFR_skill_TYPE: shortId1,shortId2,...
				${compactContent}
				
				IMPORTANT:
				- shortId is the first 8 characters of UUID.
				- Use EXACT shortId from AVAILABLE CONTENT as refId.
				- LESSON content → itemType="lesson"
				- PRACTICE content → itemType="practice_session"
				- custom_activity → itemType="custom_activity" and refId=null.
				- Use only skills from Allowed plan skills.
				- Focus skills are priority skills, not exclusive skills.
				- Reading is the base skill and should appear when reading content exists.
				- Speaking should appear when speaking content exists and it is included in Allowed plan skills.
				- Listening should appear when listening content exists and it is included in Allowed plan skills.
				
				RULES:
				1. Generate tasks only for AVAILABLE DAYS.
				2. Do NOT generate tasks for unavailable/rest days.
				3. Days use this mapping: day 1=Monday, day 2=Tuesday, day 3=Wednesday, day 4=Thursday, day 5=Friday, day 6=Saturday, day 7=Sunday.
				4. Max 4 tasks per day from day 1 to day 6.
				5. Day 7 is Sunday. Max 2 tasks on Sunday.
				6. Sunday tasks must be practice_session only.
				7. Daily total study time must be <= ${dailyMinutes} minutes.
				8. Allocate around 50–60% of tasks to priority focus skills: ${JSON.stringify(focusSkills)}.
				9. Allocate the remaining 40–50% across other allowed skills: ${JSON.stringify(planSkills)}.
				10. Include reading tasks when reading content exists.
				11. Include speaking tasks when speaking content exists and speaking is allowed.
				12. Include listening tasks when listening content exists and listening is allowed.
				13. Do NOT use skills outside Allowed plan skills: ${JSON.stringify(planSkills)}.
				14. Do NOT include weekly_review. The backend adds it automatically.
				15. Use ONLY shortIds from AVAILABLE CONTENT.
				16. rationale: max 8 words.
				17. description: null unless itemType is custom_activity.
				18. Return only valid JSON. No markdown. No explanation.
				19. Do NOT reuse the same refId more than once in the plan.
				20. Prefer using different shortIds across days.
				21. If not enough unique content exists for a skill, use another allowed skill or custom_activity.
				
				RESPOND ONLY WITH THIS JSON FORMAT:
				{
				  "planItems": [
					{
					  "day": 1,
					  "position": 1,
					  "itemType": "lesson",
					  "refId": "550e8400",
					  "title": "Short title",
					  "description": null,
					  "rationale": "Short reason.",
					  "estimatedMinutes": 25,
					  "skillName": "reading"
					}
				  ]
				}`;
	}

	// PATCH 4C: thêm listening vào skillBreakdown
	private buildWeeklyReviewPrompt(payload: any): string {
		return `You are LinguaPanda AI Tutor.
				
		Generate a weekly review for this learner.
		
		INPUT:
		${JSON.stringify(payload, null, 2)}
		
		Respond ONLY with valid JSON:
		{
		  "summary": "short weekly summary",
		  "completionRate": 75,
		  "skillBreakdown": {
			"reading":   { "trend": "improved|stable|needs_improvement", "comment": "..." },
			"writing":   { "trend": "improved|stable|needs_improvement", "comment": "..." },
			"speaking":  { "trend": "improved|stable|needs_improvement", "comment": "..." },
			"listening": { "trend": "improved|stable|needs_improvement", "comment": "..." }
		  },
		  "recommendations": ["...", "..."]
		}`;
	}
}
