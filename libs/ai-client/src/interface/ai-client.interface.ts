export interface EvaluateSurveyResponse {
	user_profile_summary: string;
	estimated_level: string;
	strengths: string[];
	weaknesses: string[];
	risk_factors: string[];
	study_advice: string[];
	recommended_focus_next_two_weeks: string[];
	_raw?: string;
}

export interface GeneratePlanResponse {
	level: string;
	weekly_hours: number;
	focus_areas: string[];
	plan_items: Array<{
		type: string;
		description: string;
		resource?: string;
	}>;
}
