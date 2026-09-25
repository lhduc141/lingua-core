import { dedent } from './dedent.util';

function formatWeaknesses(recentWeaknesses: any[]): string {
	if (!Array.isArray(recentWeaknesses) || recentWeaknesses.length === 0) return 'None';

	return recentWeaknesses
		.map((w: any) => {
			const score = w.score != null ? ` | band=${w.score}` : '';
			const evidence = w.evidence ? ` | evidence=${String(w.evidence).replace(/\s+/g, ' ').slice(0, 180)}` : '';
			return `- severity=${String(w.severity ?? 'low').toUpperCase()} | skill=${w.skill} | criterion=${w.criterion} | tag=${w.tag}${score}${evidence}`;
		})
		.join('\n');
}

function formatPerformance(skillPerformance: any[]): string {
	return (skillPerformance ?? []).map((p: any) => `${p.skill}:${p.avg}%`).join(' ') || 'no data yet';
}

function formatGoal(value: unknown): string {
	if (value == null || String(value).trim() === '') return 'not provided';
	return String(value).trim();
}

/**
 * Stage 1 of the Level-2 planner.
 * The model receives a compact semantic catalog and only selects relevant content.
 * It does NOT build the weekly schedule in this stage.
 */
export function buildPlanContentSelectionPrompt(payload: any): string {
	const { cefrLevel, contentTargetLevel, goals, skillPerformance, recentWeaknesses, candidates, selectionTarget } = payload;

	const availableDays = goals?.availableDays ?? [];
	const focusSkills = goals?.focusSkills ?? [];
	const planSkills = goals?.planSkills ?? [];
	const weaknessText = formatWeaknesses(recentWeaknesses ?? []);
	const performanceText = formatPerformance(skillPerformance ?? []);

	const catalogText = (candidates ?? [])
		.map((item: any) => {
			const description = item.description ? String(item.description).replace(/\s+/g, ' ').slice(0, 180) : 'n/a';
			return [
				`refId=${item.refId}`,
				`type=${item.itemType}`,
				`title=${String(item.title ?? '').replace(/\s+/g, ' ').slice(0, 120)}`,
				`skill=${item.skillName}`,
				`level=${item.cefrLevel ?? 'n/a'}`,
				`minutes=${item.estimatedMinutes ?? 'n/a'}`,
				`description=${description}`,
			].join(' | ');
		})
		.join('\n');

	return dedent`
		You are LinguaPanda Content Selector.
		Your ONLY task is to select the most useful learning content for a later weekly-plan generator.
		Do not create a schedule and do not invent content.

		LEARNER STATE:
		- Proficiency CEFR level: ${cefrLevel}
		- Content target level: ${contentTargetLevel ?? cefrLevel}
		- Primary goal: ${formatGoal(goals?.primaryGoal)}
		- Target goal: ${formatGoal(goals?.targetGoal)}
		- Priority focus skills: ${JSON.stringify(focusSkills)}
		- Allowed plan skills: ${JSON.stringify(planSkills)}
		- Available study days: ${JSON.stringify(availableDays)}
		- Planned study time: ${goals?.plannedStudyHoursPerWeek ?? 7} hours/week
		- Recent performance: ${performanceText}

		DIAGNOSTIC WEAKNESSES:
		${weaknessText}

		CANDIDATE CONTENT:
		${catalogText}

		SELECTION RULES:
		1. Select exactly ${selectionTarget ?? 8} unique items from CANDIDATE CONTENT.
		2. Use ONLY exact refId values shown above.
		3. Prefer content suitable for the learner's CEFR level, goals, focus skills, and recent performance.
		4. If DIAGNOSTIC WEAKNESSES are provided, prioritize content whose title/description/skill can directly support those weaknesses.
		5. If DIAGNOSTIC WEAKNESSES is "None", do not infer hidden weaknesses; select using the remaining learner-state signals.
		6. Preserve useful variety across the allowed skills when suitable content exists.
		7. Do not select the same refId twice.
		8. Return valid JSON only. No markdown and no explanation outside JSON.

		RESPOND ONLY WITH:
		{
		  "selectedContent": [
		    {
		      "refId": "550e8400"
		    }
		  ]
		}
	`;
}

/**
 * Stage 2 of the Level-2 planner.
 * Only content selected in Stage 1 is expanded with bounded details and passed here.
 */
export function buildPlanGenerationPrompt(payload: any): string {
	const {
		cefrLevel,
		contentTargetLevel,
		goals,
		weekStartDate,
		weekEndDate,
		weekDates,
		skillPerformance,
		recentWeaknesses,
		selectedContent,
		dailyMinutesLimit,
	} = payload;

	const availableDays = goals?.availableDays ?? [];
	const focusSkills = goals?.focusSkills ?? [];
	const planSkills = goals?.planSkills ?? [];
	const plannedStudyHoursPerWeek = goals?.plannedStudyHoursPerWeek || 7;
	const allowCustomActivity = payload?.allowCustomActivity !== false;
	const dailyMinutes =
		dailyMinutesLimit ?? Math.ceil((plannedStudyHoursPerWeek / Math.max(availableDays.length || 1, 1)) * 60);

	const performanceText = formatPerformance(skillPerformance ?? []);
	const weekRangeText = (weekDates ?? []).map((d: any) => `day ${d.day} = ${d.weekday}, ${d.date}`).join('\n');
	const weaknessText = formatWeaknesses(recentWeaknesses ?? []);

	const contentText = (selectedContent ?? [])
		.map((item: any) => {
			const description = item.description ? String(item.description).replace(/\s+/g, ' ').slice(0, 240) : 'n/a';
			const theorySummary = item.theorySummary
				? String(item.theorySummary).replace(/\s+/g, ' ').slice(0, 500)
				: 'n/a';
			const questionTypes = Array.isArray(item.questionTypes) ? item.questionTypes.join(',') : 'n/a';
			const sampleStems = Array.isArray(item.sampleStems)
				? item.sampleStems
						.slice(0, 2)
						.map((s: string) => String(s).replace(/\s+/g, ' ').slice(0, 180))
						.join(' || ')
				: 'n/a';

			return [
				`refId=${item.refId}`,
				`type=${item.itemType}`,
				`title=${String(item.title ?? '').replace(/\s+/g, ' ').slice(0, 120)}`,
				`skill=${item.skillName}`,
				`level=${item.cefrLevel ?? 'n/a'}`,
				`minutes=${item.estimatedMinutes ?? 'n/a'}`,
				`description=${description}`,
				`theory=${theorySummary}`,
				`questionCount=${item.questionCount ?? 'n/a'}`,
				`questionTypes=${questionTypes}`,
				`samples=${sampleStems}`,
			].join(' | ');
		})
		.join('\n');

	const customActivityImportant = allowCustomActivity
		? '- custom_activity => itemType="custom_activity" and refId=null.'
		: '- Custom activities are disabled for this run. Use only selected lesson/practice_session catalog references.';
	const descriptionRule = allowCustomActivity
		? '16. description: null unless itemType is custom_activity.'
		: '16. description: null.';
	const insufficientContentRule = allowCustomActivity
		? '20. If selected content is insufficient for the schedule, use another selected item or a custom_activity.'
		: '20. Use only selected catalog content. Do not invent replacement activities or use custom_activity.';
	const weaknessRule = allowCustomActivity
		? '21. If DIAGNOSTIC WEAKNESSES are provided, include 1-2 tasks that directly address the highest-priority weaknesses. If no selected lesson/practice suitably addresses a weakness, use itemType="custom_activity" with a concise remedial description and reference that weakness in the rationale.'
		: '21. If DIAGNOSTIC WEAKNESSES are provided, prioritize 1-2 selected catalog tasks that directly address the highest-priority weaknesses when suitable selected content exists. Do not invent custom activities.';


	return dedent`
		You are LinguaPanda AI Tutor — adaptive English learning plan generator.

		LEARNER:
		- Proficiency CEFR level: ${cefrLevel}
		- Content target level: ${contentTargetLevel ?? cefrLevel}
		- Primary goal: ${formatGoal(goals?.primaryGoal)}
		- Target goal: ${formatGoal(goals?.targetGoal)}
		- Priority focus skills: ${JSON.stringify(focusSkills)}
		- Allowed plan skills: ${JSON.stringify(planSkills)}
		- Planned study time: ${plannedStudyHoursPerWeek} hours/week
		- Daily time limit: ${dailyMinutes} minutes
		- Recent performance: ${performanceText}

		DIAGNOSTIC WEAKNESSES:
		${weaknessText}

		CURRENT WEEK:
		- weekStartDate: ${weekStartDate}
		- weekEndDate: ${weekEndDate}

		WEEK RANGE:
		${weekRangeText}

		AVAILABLE DAYS:
		${JSON.stringify(availableDays)}

		SELECTED CONTENT FROM STAGE 1:
		${contentText}

		IMPORTANT:
		- refId is a short stable identifier resolved by the backend to the full database UUID.
		- Use EXACT refId values from SELECTED CONTENT as refId.
		- type=lesson => itemType="lesson".
		- type=practice_session => itemType="practice_session".
		${customActivityImportant}
		- Use only skills from Allowed plan skills.
		- Focus skills are priority skills, not exclusive skills.
		- Reading is the base skill and should appear when appropriate selected reading content exists.
		- Speaking should appear when appropriate selected speaking content exists and it is allowed.
		- Listening is not developed yet. Do NOT generate listening tasks.
		- Content target level is the catalog level used for retrieval. It may be lower than the learner's proficiency when the current catalog has a ceiling (for example C1 proficiency using B2 content). Do not invent unavailable higher-level content.

		RULES:
		1. Generate tasks only for AVAILABLE DAYS.
		2. Do NOT generate tasks for unavailable/rest days.
		3. Days: day 1=Monday, day 2=Tuesday, day 3=Wednesday, day 4=Thursday, day 5=Friday, day 6=Saturday, day 7=Sunday.
		4. Max 4 tasks per day from day 1 to day 6.
		5. Day 7 is Sunday. Max 2 tasks on Sunday.
		6. Sunday tasks must be practice_session only.
		7. Daily total study time must be <= ${dailyMinutes} minutes.
		8. Total scheduled task time for the week must be <= ${plannedStudyHoursPerWeek * 60} minutes.
		9. Allocate approximately 50-60% of tasks to priority focus skills when enough suitable selected content exists: ${JSON.stringify(focusSkills)}.
		10. Allocate remaining tasks across other allowed skills when suitable selected content exists: ${JSON.stringify(planSkills)}.
		11. Do NOT generate listening tasks.
		12. Do NOT use skills outside: ${JSON.stringify(planSkills)}.
		13. Do NOT include weekly_review.
		14. Use ONLY refIds from SELECTED CONTENT for lesson/practice_session tasks.
		15. rationale: max 8 words.
		${descriptionRule}
		17. Return only valid JSON. No markdown. No explanation.
		18. Do NOT reuse the same refId more than once.
		19. Prefer different refIds across days.
		${insufficientContentRule}
		${weaknessRule}
		22. If DIAGNOSTIC WEAKNESSES is "None", do not invent a weakness; personalize using proficiency, goals, focus skills, schedule, and recent performance.
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
