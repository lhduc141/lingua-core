import { dedent } from './dedent.util';

export function buildSurveyPrompt(survey: any): string {
	return dedent`
		You are LinguaPanda AI Tutor.

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
		  "recommended_focus_next_two_weeks": ["reading", "writing", "speaking"]
		}
	`;
}
