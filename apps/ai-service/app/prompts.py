from .schemas import CEFRRequest

def build_cefr_prompt(req: CEFRRequest):
    section_text = "\n".join(
        f"- {s.section}: {s.score}/{s.max_score}"
        for s in req.section_scores
    )

    onboarding_text = f"""
Goal: {req.onboarding.main_goal}
Target months: {req.onboarding.target_months}
Hours per week: {req.onboarding.hours_per_week}
Priority skills: {", ".join(req.onboarding.priority_skills)}
Self-assessed level: {req.onboarding.self_assessed_level or "N/A"}
Difficulties: {", ".join(req.onboarding.difficulties) or "N/A"}
    """.strip()

    system_msg = (
        "You are an English CEFR expert. "
        "Evaluate the user's CEFR level based on placement scores, onboarding info and writing. "
        "Return ONLY valid JSON with: overall_level, summary, strengths, weaknesses, bands[]. "
        "Each band = {skill, level, comment}."
    )

    user_msg = f"""
Placement:
{section_text}

Onboarding:
{onboarding_text}

Writing:
\"\"\"{req.writing_text}\"\"\"

Return ONLY JSON. No markdown, no explanation outside JSON.
"""
    return system_msg, user_msg
