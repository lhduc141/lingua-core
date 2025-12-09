// apps/ai-service/src/ai/ai.dto.ts

// Input DTOs
export class PlacementSectionScoreDto {
	section: string;
	score: number;
	max_score: number;
}

export class OnboardingSummaryDto {
	main_goal: string;
	target_months: number;
	hours_per_week: number;
	priority_skills: string[];
	self_assessed_level?: string;
	difficulties: string[];
}

export class CEFRRequestDto {
	writing_text: string;
	section_scores: PlacementSectionScoreDto[];
	onboarding: OnboardingSummaryDto;
}

// Output DTOs
export class CEFRBandDto {
	skill: string;
	level: string;
	score?: number;
	comment: string;
}

export class CEFREvaluationDto {
	overall_level: string;
	summary: string;
	strengths: string[];
	weaknesses: string[];
	bands: CEFRBandDto[];
}
