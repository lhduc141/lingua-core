import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiDictionaryOutput } from '../../api-gateway/src/modules/dictionary/interface/ai-dictionary-output.interface';
import { Groq } from 'groq-sdk';

const RETRY_DELAYS = [2000, 5000, 10000];

@Injectable()
export class AiServiceService {
	private readonly logger = new Logger(AiServiceService.name);

	private groq: Groq;
	private model: string;

	constructor(private configService: ConfigService) {
		const apiKey = this.configService.get<string>('GROQ_API_KEY');
		if (!apiKey) throw new Error('GROQ_API_KEY is not defined');

		this.groq = new Groq({ apiKey });
		this.model = this.configService.get<string>('LLM_MODEL') || 'llama-3.3-70b-versatile';

		this.logger.log(`AI Service initialized | model=${this.model}`);
	}

	// ─── Core helpers ─────────────────────────────────────────────────────────

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

	// ─── Public methods ───────────────────────────────────────────────────────

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
		const raw = await this.callGroq(prompt, true);
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
		return JSON.parse(this.cleanJson(raw));
	}

	private async callGroq(prompt: string, jsonMode = false): Promise<string> {
		let lastError: any;
		for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
			try {
				const completion = await this.groq.chat.completions.create({
					model: this.model,
					messages: [{ role: 'user', content: prompt }],
					temperature: 0.3,
					max_tokens: 8192,
					...(jsonMode && { response_format: { type: 'json_object' } }),
				});
				return completion.choices[0]?.message?.content ?? '';
			} catch (error) {
				lastError = error;
				const status = error?.status ?? error?.statusCode;
				const retryable = status === 503 || status === 429 || status === 500;

				if (!retryable || attempt >= RETRY_DELAYS.length) {
					this.logger.error(`callGroq failed (attempt ${attempt + 1}): ${error.message}`);
					throw error;
				}

				const delay = RETRY_DELAYS[attempt]!;
				this.logger.warn(`callGroq got ${status}, retry in ${delay}ms (${attempt + 1}/${RETRY_DELAYS.length})`);
				await new Promise((r) => setTimeout(r, delay));
			}
		}
		throw lastError;
	}

	private cleanJson(raw: string): string {
		return raw
			.replace(/```json\s*/gi, '')
			.replace(/```\s*/g, '')
			.trim();
	}

	// ─── Prompt builders (giữ nguyên) ────────────────────────────────────────

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
				{ "text": "She was happy to see her friends.", "viText": "Cô ấy vui khi gặp bạn bè." }
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

	private buildSurveyPrompt(survey: any): string {
		return `You are Linguapanda AI Tutor, a personalized English learning assistant.
				Your job is to analyze the user's Onboarding Survey and produce a clear, actionable evaluation.
				The evaluation MUST be grounded strictly in the data provided.
				
				# USER SURVEY DATA (JSON)
				${JSON.stringify(survey, null, 2)}
				
				Respond only with valid JSON.`;
	}

	private buildGradingPrompt(questionType: string, userText: string): string {
		const typeLabel = questionType === 'speaking' ? 'speaking transcript' : 'written essay';

		return `You are an English language examiner for Vietnamese learners (A1-B2 CEFR level).
				Grade the following ${typeLabel} and provide detailed feedback.
				
				USER TEXT:
				"${userText}"
				
				SCORING CRITERIA:
				- Grammar accuracy
				- Vocabulary range
				- Coherence and cohesion
				- Task achievement
				
				RULES:
				1. overallScore: 0-10 (integer or .5 steps)
				2. dimensions: array of 4 criteria with name, score (0-10), comment
				3. corrections: up to 5 specific errors with original text, corrected version, and grammar rule
				4. suggestions: 2-3 actionable improvement tips
				
				Respond ONLY with valid JSON, no markdown, no explanation:
				
				{
				  "overallScore": 7.5,
				  "dimensions": [
					{ "name": "Grammar", "score": 7, "comment": "Good use of tenses but some subject-verb agreement errors." },
					{ "name": "Vocabulary", "score": 8, "comment": "Good range of vocabulary for A2-B1 level." },
					{ "name": "Coherence", "score": 7.5, "comment": "Ideas are connected logically." },
					{ "name": "Task Achievement", "score": 7.5, "comment": "Addressed the main points adequately." }
				  ],
				  "corrections": [
					{
					  "original": "She go to school every day",
					  "corrected": "She goes to school every day",
					  "rule": "Third person singular present simple requires -s/-es"
					}
				  ],
				  "suggestions": [
					"Practice using more complex sentence structures to improve your score.",
					"Review subject-verb agreement rules for third person singular."
				  ]
				}`;
	}

	private buildPlanGenerationPrompt(payload: any): string {
		const {
			cefrLevel,
			goals,
			weekNumber,
			currentCycle,
			previousWeekReview,
			userFeedback,
			availableContent,
			recentPerformance,
		} = payload;
		const dailyMinutes = Math.ceil(((goals?.plannedStudyHoursPerWeek || 7) / 7) * 60);

		const compactContent = {
			lessons: (availableContent?.lessons || []).map((l: any) => ({
				id: l.lessonId ?? l.id,
				title: l.title,
				skill: l.skillName,
				cefr: l.cefrLevel,
			})),
			questionSets: (availableContent?.questionSets || []).map((q: any) => ({
				id: q.questionSetId ?? q.id,
				title: q.title,
				skill: q.skillName,
				cefr: q.cefrLevel,
			})),
		};

		return `You are LinguaPanda AI Tutor — an adaptive English learning plan generator.

			LEARNER PROFILE:
			- CEFR Level: ${cefrLevel}
			- Primary Goal: ${goals?.primaryGoal || 'general'}
			- Focus Skills: ${JSON.stringify(goals?.focusSkills || ['reading', 'writing', 'speaking'])}
			- Study Hours/Week: ${goals?.plannedStudyHoursPerWeek || 7}
			- Cycle: ${currentCycle}, Week: ${weekNumber}
			
			${recentPerformance ? `RECENT PERFORMANCE:\n${JSON.stringify(recentPerformance)}` : ''}
			${previousWeekReview ? `WEEK 1 REVIEW:\n${JSON.stringify(previousWeekReview)}` : ''}
			${userFeedback ? `USER FEEDBACK: "${userFeedback}"` : ''}
			
			AVAILABLE CONTENT (use these IDs only):
			${JSON.stringify(compactContent)}
			
			RULES:
			1. Days 1-7 (week1) or 8-14 (week2). Max 3 tasks/day.
			2. Types: "lesson" or "practice_session" (use id from above), "custom_activity" (refId: null)
			3. Keep rationale under 10 words. Set description to null unless custom_activity.
			4. Total daily time ≤ ${dailyMinutes} mins.
			5. Focus skills (allocate 60% tasks): ${JSON.stringify(goals?.focusSkills || [])}
			Base skill (always include, 40% tasks): reading
			
			RESPOND ONLY WITH JSON (no markdown):
			{"planItems":[{"day":1,"position":1,"itemType":"lesson","refId":"uuid","title":"...","description":null,"rationale":"Short reason.","estimatedMinutes":25,"skillName":"reading"}]}`;
	}

	private buildWeeklyReviewPrompt(payload: any): string {
		const { weekNumber, planItems, assessmentResults, completedTasks, totalTasks, skippedTasks, cefrLevel } =
			payload;

		return `You are LinguaPanda AI Tutor — generate a weekly learning review for a Vietnamese English learner.

CONTEXT:
- CEFR Level: ${cefrLevel}
- Week: ${weekNumber}
- Tasks Completed: ${completedTasks}/${totalTasks}
- Skipped Tasks: ${JSON.stringify(skippedTasks || [])}

COMPLETED PLAN ITEMS:
${JSON.stringify(planItems || [], null, 2)}

ASSESSMENT RESULTS THIS WEEK:
${JSON.stringify(assessmentResults || [], null, 2)}

REVIEW RULES:
1. Provide honest, encouraging summary
2. Calculate skill-level breakdown with trend (strong / improving / needs_improvement)
3. Identify 2-3 specific strengths with evidence
4. Identify 2-3 specific weaknesses with evidence
5. Give 2-3 actionable recommendations for next week
6. Use Vietnamese-friendly language (mix Vietnamese where helpful)
7. Be specific — reference actual tasks and scores, not generic advice

Respond ONLY with valid JSON, no markdown:
{
  "summary": {
    "completedTasks": ${completedTasks},
    "totalTasks": ${totalTasks},
    "completionRate": 83.3,
    "totalStudyMinutes": 312,
    "averageTaskScore": 7.2
  },
  "skillBreakdown": {
    "reading": { "avgScore": 82, "tasksCompleted": 5, "trend": "strong" },
    "writing": { "avgScore": 58, "tasksCompleted": 3, "trend": "needs_improvement" },
    "speaking": { "avgScore": 65, "tasksCompleted": 2, "trend": "improving" }
  },
  "strengths": [
    "Reading comprehension tốt — đạt 82% trung bình, cao hơn target."
  ],
  "weaknesses": [
    "Writing: Lỗi subject-verb agreement xuất hiện nhiều lần."
  ],
  "recommendations": [
    "Tăng Writing practice từ 3→5 tasks tuần sau.",
    "Thêm grammar drill về subject-verb agreement."
  ]
}`;
	}
}
