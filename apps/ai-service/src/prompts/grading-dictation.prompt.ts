import { dedent } from './dedent.util';
import { GradingPayload } from './grading-writing.prompt';

export function buildDictationGradingPrompt(payload: GradingPayload): string {
	const { userText } = payload;

	return dedent`
		You are an English teacher. Grade the following dictation response.

		USER TEXT:
		${JSON.stringify(userText)}

		RULES:
		1. overallScore: 0-10, integer or .5 steps.
		2. criterionBands: exactly 4 items with name, bandEstimate, internalScore, summary, strengths, weaknesses. subCriteria = [].
		3. corrections: up to 5 specific errors with type, original, corrected, explanation, severity.
		4. priorityFixes: top 3 fixes.
		5. Respond ONLY with valid JSON.

		{
		  "assessmentType": "dictation",
		  "currentLevel": null,
		  "targetLevel": null,
		  "currentBand": null,
		  "targetBand": null,
		  "nextBandTarget": null,
		  "wordCount": 0,
		  "wordCountStatus": "",
		  "estimatedIeltsBand": null,
		  "internalScore": 7.5,
		  "overallScore": 7.5,
		  "scoreConfidence": "high",
		  "scoreRationale": "...",
		  "criterionBands": [
		    { "name": "Spelling",     "bandEstimate": null, "internalScore": 7,   "summary": "...", "strengths": ["..."], "weaknesses": ["..."], "subCriteria": [] },
		    { "name": "Word Accuracy","bandEstimate": null, "internalScore": 8,   "summary": "...", "strengths": ["..."], "weaknesses": ["..."], "subCriteria": [] },
		    { "name": "Punctuation",  "bandEstimate": null, "internalScore": 7.5, "summary": "...", "strengths": ["..."], "weaknesses": ["..."], "subCriteria": [] },
		    { "name": "Completeness", "bandEstimate": null, "internalScore": 7.5, "summary": "...", "strengths": ["..."], "weaknesses": ["..."], "subCriteria": [] }
		  ],
		  "corrections": [
		    { "type": "spelling", "original": "recieve", "corrected": "receive", "explanation": "i before e except after c", "severity": "medium" }
		  ],
		  "styleImprovements": [],
		  "priorityFixes": [
		    { "priority": 1, "area": "Spelling", "problem": "...", "action": "...", "expectedImpact": "..." }
		  ],
		  "nextLevelGaps": [],
		  "correctedText": null,
		  "pronunciationConfidence": null
		}
	`;
}
