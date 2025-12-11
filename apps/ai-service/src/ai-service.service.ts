// app.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiServiceService {
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

	async evaluateSurvey(survey: any) {
		const prompt = this.buildUserSurveyEvaluationPrompt(survey);

		try {
			const result = await this.model.generateContent(prompt);
			const raw = result.response.text();

			try {
				return JSON.parse(raw);
			} catch (e) {
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
			return {
				error: true,
				message: error.message,
			};
		}
	}

	buildUserSurveyEvaluationPrompt(survey: any) {
		return `
			You are Linguapanda AI Tutor, a personalized English learning assistant.
			Your job is to analyze the user's Onboarding Survey and produce a clear,
			actionable evaluation of their current English learning situation.
			
			The evaluation MUST be grounded strictly in the data provided.
			You must not invent data that is not explicitly included.
			
			---
			
			# USER SURVEY DATA (JSON)
			${JSON.stringify(survey, null, 2)}
			
			---
			
			# YOUR TASK:
			Analyze the user's survey and create a structured evaluation focusing on:
			
			1. **User profile summary**  
			   - Restate their goal in a clear way  
			   - Estimate their likely English level based on their self-assessment  
			   - Identify the motivation and context of use  
			
			2. **Strengths**  
			   Based on user answers, infer what they are probably relatively better at.  
			   Example: “Reading seems stronger because the user struggles more with speaking.”
			
			3. **Weaknesses**  
			   Identify weaknesses based on:  
			   - difficulties listed  
			   - priority skills  
			   - goal–skill mismatch  
			
			4. **Risk factors**  
			   Example:  
			   - Low commitment (hours/week < 3)  
			   - Very broad goals  
			   - Deadline unrealistic  
			   - Many difficulty areas  
			
			5. **Study advice**  
			   Give simple, actionable, concrete recommendations the user can follow immediately.  
			   Recommendations should be specific, measurable, and realistic.
			
			6. **Recommended focus for the next 2 weeks**  
			   Choose 1–3 priority skills the user should work on FIRST.
			
			---
			
			# OUTPUT FORMAT (STRICT JSON ONLY):
			
			{
			  "user_profile_summary": "...",
			  "estimated_level": "A1 | A2 | B1 | B2 | C1 | Unknown",
			  "strengths": [],
			  "weaknesses": [],
			  "risk_factors": [],
			  "study_advice": [],
			  "recommended_focus_next_two_weeks": []
			}
			
			Do not include any explanation outside the JSON.
			If information is missing, fill with best inference or "Unknown".
			`;
	}
}
