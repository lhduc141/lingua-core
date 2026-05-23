import { dedent } from './dedent.util';

export function buildPlanGenerationPrompt(payload: any): string {
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

	const availableDays            = goals?.availableDays ?? [];
	const focusSkills              = goals?.focusSkills ?? [];
	const planSkills               = goals?.planSkills ?? [];
	const plannedStudyHoursPerWeek = goals?.plannedStudyHoursPerWeek || 7;
	const dailyMinutes             =
		dailyMinutesLimit ??
		Math.ceil((plannedStudyHoursPerWeek / Math.max(availableDays.length || 1, 1)) * 60);

	const perfStr      = (skillPerformance ?? []).map((p: any) => `${p.skill}:${p.avg}%`).join(' ') || 'no data yet';
	const weekRangeText = (weekDates ?? []).map((d: any) => `day ${d.day} = ${d.weekday}, ${d.date}`).join('\n');

	return dedent`
		You are LinguaPanda AI Tutor — adaptive English learning plan generator.

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
		- LESSON content => itemType="lesson"
		- PRACTICE content => itemType="practice_session"
		- custom_activity => itemType="custom_activity" and refId=null.
		- Use only skills from Allowed plan skills.
		- Focus skills are priority skills, not exclusive skills.
		- Reading is the base skill and should appear when reading content exists.
		- Speaking should appear when speaking content exists and it is included in Allowed plan skills.
		- Listening is not developed yet. Do NOT generate listening tasks.

		RULES:
		1. Generate tasks only for AVAILABLE DAYS.
		2. Do NOT generate tasks for unavailable/rest days.
		3. Days: day 1=Monday, day 2=Tuesday, day 3=Wednesday, day 4=Thursday, day 5=Friday, day 6=Saturday, day 7=Sunday.
		4. Max 4 tasks per day from day 1 to day 6.
		5. Day 7 is Sunday. Max 2 tasks on Sunday.
		6. Sunday tasks must be practice_session only.
		7. Daily total study time must be <= ${dailyMinutes} minutes.
		8. Allocate 50-60% of tasks to priority focus skills: ${JSON.stringify(focusSkills)}.
		9. Allocate 40-50% across other allowed skills: ${JSON.stringify(planSkills)}.
		10. Include reading tasks when reading content exists.
		11. Include speaking tasks when speaking content exists and allowed.
		12. Do NOT generate listening tasks.
		13. Do NOT use skills outside: ${JSON.stringify(planSkills)}.
		14. Do NOT include weekly_review.
		15. Use ONLY shortIds from AVAILABLE CONTENT.
		16. rationale: max 8 words.
		17. description: null unless itemType is custom_activity.
		18. Return only valid JSON. No markdown. No explanation.
		19. Do NOT reuse the same refId more than once.
		20. Prefer different shortIds across days.
		21. If not enough content, use another allowed skill or custom_activity.

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
		}
	`;
}

export function buildWeeklyReviewPrompt(payload: any): string {
	return dedent`
		You are LinguaPanda AI Tutor.

		Generate a weekly review for this learner.

		INPUT:
		${JSON.stringify(payload, null, 2)}

		Respond ONLY with valid JSON:
		{
		  "summary": "short weekly summary",
		  "completionRate": 75,
		  "skillBreakdown": {
		    "reading":  { "trend": "improved|stable|needs_improvement", "comment": "..." },
		    "writing":  { "trend": "improved|stable|needs_improvement", "comment": "..." },
		    "speaking": { "trend": "improved|stable|needs_improvement", "comment": "..." }
		  },
		  "recommendations": ["...", "..."]
		}
	`;
}
