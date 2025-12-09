from pydantic import BaseModel
from typing import List, Optional


class PlacementSectionScore(BaseModel):
    section: str
    score: float
    max_score: float


class OnboardingSummary(BaseModel):
    main_goal: str
    target_months: int
    hours_per_week: int
    priority_skills: List[str]
    self_assessed_level: Optional[str] = None
    difficulties: List[str] = []


class CEFRRequest(BaseModel):
    writing_text: str
    section_scores: List[PlacementSectionScore]
    onboarding: OnboardingSummary


class CEFRBand(BaseModel):
    skill: str
    level: str
    comment: str


class CEFREvaluation(BaseModel):
    overall_level: str
    summary: str
    strengths: List[str]
    weaknesses: List[str]
    bands: List[CEFRBand] = []
