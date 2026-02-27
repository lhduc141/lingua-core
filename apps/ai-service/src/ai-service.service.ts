import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import { AiDictionaryOutput } from '../../api-gateway/src/modules/dictionary/inteface/ai-dictionary-output.interface';

@Injectable()
export class AiServiceService {
	private readonly logger = new Logger(AiServiceService.name);
	private genAI: GoogleGenerativeAI;
	private model: GenerativeModel;

	constructor(private configService: ConfigService) {
		const geminiKey = this.configService.get<string>('LLM_API_KEY');
		if (!geminiKey) throw new Error('LLM_API_KEY is not defined');

		this.genAI = new GoogleGenerativeAI(geminiKey);
		this.model = this.genAI.getGenerativeModel({
			model: this.configService.get<string>('LLM_MODEL') || 'gemini-1.5-pro-latest',
			generationConfig: {
				maxOutputTokens: 6000,
				temperature: 0.3,
			},
		});
	}

	async ask(prompt: string): Promise<string> {
		try {
			const result = await this.model.generateContent(prompt);
			return result.response.text();
		} catch (error) {
			return `Error: ${error.message}`;
		}
	}

	async evaluateSurvey(survey: any) {
		const prompt = this.buildSurveyPrompt(survey);
		try {
			const result = await this.model.generateContent(prompt);
			const raw = result.response.text();
			try {
				return JSON.parse(raw);
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

		const result = await this.model.generateContent(prompt);
		const raw = result.response.text();

		// Gemini đôi khi wrap trong ```json ... ``` — strip ra
		const clean = raw
			.replace(/```json\s*/gi, '')
			.replace(/```\s*/g, '')
			.trim();

		const parsed = JSON.parse(clean) as AiDictionaryOutput;

		this.logger.log(`Dictionary generated: "${word}" → root "${parsed.headword}", ${parsed.senses?.length} senses`);
		return parsed;
	}

	async gradeSubmission(questionType: string, userText: string) {
		const prompt = this.buildGradingPrompt(questionType, userText);
		const result = await this.model.generateContent(prompt);
		const raw = result.response.text();
		const clean = raw
			.replace(/```json\s*/gi, '')
			.replace(/```\s*/g, '')
			.trim();
		const parsed = JSON.parse(clean);
		this.logger.log(`Grading completed: type=${questionType}, score=${parsed.overallScore}`);
		return parsed;
	}

	async generatePlanItems(payload: any) {
		const prompt = this.buildPlanGenerationPrompt(payload);
		const result = await this.model.generateContent(prompt);
		const raw = result.response.text();
		const clean = raw
			.replace(/```json\s*/gi, '')
			.replace(/```\s*/g, '')
			.trim();
		const parsed = JSON.parse(clean);
		this.logger.log(`Plan generated: cycle=${payload.currentCycle}, week=${payload.weekNumber}, items=${parsed.planItems?.length}`);
		return parsed;
	}

	async generateWeeklyReview(payload: any) {
		const prompt = this.buildWeeklyReviewPrompt(payload);
		const result = await this.model.generateContent(prompt);
		const raw = result.response.text();
		const clean = raw
			.replace(/```json\s*/gi, '')
			.replace(/```\s*/g, '')
			.trim();
		const parsed = JSON.parse(clean);
		this.logger.log(`Weekly review generated: week=${payload.weekNumber}, completionRate=${parsed.summary?.completionRate}`);
		return parsed;
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
		const { cefrLevel, goals, weekNumber, currentCycle, previousWeekReview, userFeedback, availableContent, recentPerformance } = payload;
		const dailyMinutes = Math.ceil((goals?.plannedStudyHoursPerWeek || 7) / 7 * 60);

		return `You are LinguaPanda AI Tutor — an adaptive English learning plan generator for Vietnamese learners.

LEARNER PROFILE:
- CEFR Level: ${cefrLevel}
- Primary Goal: ${goals?.primaryGoal || 'general'}
- Focus Skills: ${JSON.stringify(goals?.focusSkills || ['reading', 'writing', 'speaking'])}
- Study Hours/Week: ${goals?.plannedStudyHoursPerWeek || 7}
- Cycle: ${currentCycle}, Week: ${weekNumber}

${recentPerformance ? `RECENT PERFORMANCE:\n${JSON.stringify(recentPerformance, null, 2)}` : ''}
${previousWeekReview ? `WEEK 1 REVIEW (AI-generated):\n${JSON.stringify(previousWeekReview, null, 2)}` : ''}
${userFeedback ? `USER FEEDBACK ON PREVIOUS WEEK:\n"${userFeedback}"` : ''}

AVAILABLE CONTENT:
${JSON.stringify(availableContent || {}, null, 2)}

TASK GENERATION RULES:
1. Generate tasks for 7 days (day 1-7 for week 1, day 8-14 for week 2)
2. Each day has 2-4 tasks depending on available study time
3. Task types: "lesson" (with refId), "practice_session" (with refId), "custom_activity" (no refId)
4. Week 1: 50% lesson, 30% practice, 20% custom. Week 2: 30% lesson, 40% practice, 30% custom
5. Custom activities = specific writing/speaking exercises with clear instructions in description
6. Each task MUST have a "rationale" explaining WHY this task helps the learner
7. Respect user's focus skills — allocate more tasks to those skills
8. If user feedback says something is too hard, lower difficulty for that skill
9. Total daily time should not exceed: ${dailyMinutes} minutes
10. Only use refId values from AVAILABLE CONTENT. Use null for custom_activity.

Respond ONLY with valid JSON, no markdown:
{
  "planItems": [
    {
      "day": 1,
      "position": 1,
      "itemType": "lesson",
      "refId": "uuid-of-lesson",
      "title": "Reading: Daily Life Topics",
      "description": null,
      "rationale": "Foundation for A2 reading comprehension, aligned with career goal.",
      "estimatedMinutes": 30,
      "skillName": "reading"
    },
    {
      "day": 1,
      "position": 2,
      "itemType": "custom_activity",
      "refId": null,
      "title": "Writing Practice: Simple Sentences",
      "description": "Write 5 sentences about your daily routine using Present Simple tense. Include: wake up, eat, work, exercise, sleep.",
      "rationale": "Writing score lower than reading — sentence-level practice builds foundation.",
      "estimatedMinutes": 15,
      "skillName": "writing"
    }
  ]
}`;
	}

	private buildWeeklyReviewPrompt(payload: any): string {
		const { weekNumber, planItems, assessmentResults, completedTasks, totalTasks, skippedTasks, cefrLevel } = payload;

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
