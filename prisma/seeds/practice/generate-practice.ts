/**
 * generate-practice.ts
 *
 * Gọi Gemini để generate standalone QuestionSets (practice thuần).
 * Output: prisma/seeds/data/practice-{skill}-{level}.json (12 files)
 *
 * Mỗi file: 10 practice sets × 1 skill × 1 level
 * Mỗi set:
 *   Reading:  1 passage + 10 MCQ questions
 *   Writing:  10 fill_blank questions
 *   Speaking: 8 MCQ + 2 speaking tasks
 *
 * Usage:
 *   pnpm exec tsx prisma/seeds/generate-practice.ts              # all 12
 *   pnpm exec tsx prisma/seeds/generate-practice.ts reading A1   # chỉ 1
 *   pnpm exec tsx prisma/seeds/generate-practice.ts --force      # overwrite
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const genAI = new GoogleGenerativeAI(process.env.LLM_API_KEY!);
const model = genAI.getGenerativeModel({
	model: process.env.LLM_MODEL || 'gemini-2.5-flash',
	generationConfig: {
		maxOutputTokens: 32000,
		temperature: 0.4,
	},
});

const OUTPUT_DIR = path.resolve(__dirname, 'data');
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function cleanJson(raw: string): string {
	return raw
		.replace(/```json\s*/gi, '')
		.replace(/```\s*/g, '')
		.replace(/[\u0080-\u009F]/g, '') // Remove control characters
		.trim();
}

// ─── THEMES (10 per skill/level) ─────────────────────────────────────────────

const THEMES: Record<string, Record<string, string[]>> = {
	reading: {
		A1: [
			'People and Places',
			'Food and Drink',
			'My Daily Life',
			'Animals Around Us',
			'Home and Family',
			'At School',
			'Weather and Nature',
			'Free Time Activities',
			'Shopping and Money',
			'Friends and Feelings',
		],
		A2: [
			'Travel and Transport',
			'Health and Body',
			'Jobs and Work',
			'Hobbies and Sports',
			'City Life',
			'Food Culture',
			'Technology Basics',
			'Environment and Nature',
			'Celebrations and Traditions',
			'Learning New Skills',
		],
		B1: [
			'Social Media and Communication',
			'Education Systems',
			'Health and Lifestyle',
			'Work and Career',
			'Environment and Sustainability',
			'Travel Experiences',
			'Science and Technology',
			'Culture and Identity',
			'Money and Finance',
			'News and Current Events',
		],
		B2: [
			'Globalization and Society',
			'Ethics and Technology',
			'Economic Issues',
			'Psychology and Behavior',
			'Media and Democracy',
			'Scientific Research',
			'Literature and Culture',
			'Urban Development',
			'Climate and Environment',
			'Future of Work',
		],
	},
	writing: {
		A1: [
			'Everyday Sentences: Home and Family',
			'Grammar Focus: Simple Present',
			'Vocabulary: Food and Drink',
			'Complete the Sentence: School Life',
			'Words in Context: Weather',
			'Fill the Gap: Daily Routines',
			'Basic Vocabulary: Colors and Numbers',
			'Grammar: "have" and "be"',
			'Sentence Completion: Animals',
			'Vocabulary Test: Feelings',
		],
		A2: [
			'Grammar: Past Simple Tense',
			'Vocabulary: Travel and Transport',
			'Fill the Gap: Health and Body',
			'Grammar: Comparatives and Superlatives',
			'Words in Context: Jobs',
			'Grammar: Future with "going to"',
			'Vocabulary: Hobbies and Sports',
			'Fill the Gap: City Life',
			'Grammar: Modal Verbs (can, should)',
			'Vocabulary: Food and Cooking',
		],
		B1: [
			'Advanced Grammar: Conditionals',
			'Academic Vocabulary: Environment',
			'Fill the Gap: Technology in Society',
			'Grammar: Passive Voice',
			'Vocabulary: Work and Career',
			'Words in Context: Education',
			'Grammar: Reported Speech',
			'Academic Words: Health and Science',
			'Fill the Gap: Media and News',
			'Mixed Grammar: B1 Review',
		],
		B2: [
			'Advanced Vocabulary: Business and Economics',
			'Grammar: Complex Noun Phrases',
			'Academic Words: Social Issues',
			'Fill the Gap: Ethics and Philosophy',
			'Grammar: Discourse Markers',
			'Vocabulary: Science and Research',
			'Words in Context: Psychology',
			'Grammar: Inversion and Emphasis',
			'Academic Writing: Hedging Language',
			'Mixed Vocabulary: B2 Review',
		],
	},
	speaking: {
		A1: [
			'Introduce Yourself and Others',
			'Talk About Your Daily Routine',
			'Describe Your Home',
			'Talk About Food Preferences',
			'Describe an Animal',
			'Talk About School',
			'Describe the Weather',
			'Talk About Hobbies',
			'Describe Your Family',
			'Talk About Your Favorite Things',
		],
		A2: [
			'Describe a Recent Trip',
			'Talk About Your Job or Studies',
			'Discuss Health and Fitness',
			'Talk About a Hobby or Sport',
			'Describe Your Neighborhood',
			'Discuss Plans for the Weekend',
			'Talk About a Film or Book',
			'Describe a Festival or Tradition',
			'Talk About Helping Others',
			'Discuss Technology Use',
		],
		B1: [
			'Discuss Environmental Problems',
			'Talk About Career Goals',
			'Discuss Social Media Impact',
			'Describe a Cultural Experience',
			'Discuss Health Trends',
			'Talk About Education Systems',
			'Discuss Work-Life Balance',
			'Describe a News Story',
			'Talk About Sustainable Living',
			'Discuss Technology and Society',
		],
		B2: [
			'Debate: Social Media and Privacy',
			'Discuss Globalization Effects',
			'Analyze an Ethical Dilemma',
			'Discuss Economic Inequality',
			'Critique a Media Report',
			'Debate: AI in Education',
			'Discuss Climate Change Solutions',
			'Analyze Political Participation',
			'Discuss Psychology of Decisions',
			'Debate: Future of Work',
		],
	},
};

// ─── PROMPT BUILDERS ──────────────────────────────────────────────────────────

function buildReadingPracticePrompt(cefrLevel: string, themes: string[]): string {
	const wordRange =
		cefrLevel === 'A1' ? '70–110' : cefrLevel === 'A2' ? '110–160' : cefrLevel === 'B1' ? '170–230' : '230–310';
	const mins = cefrLevel === 'A1' ? 15 : cefrLevel === 'A2' ? 20 : cefrLevel === 'B1' ? 25 : 30;

	return `You are a senior English language curriculum designer creating standalone reading practice sets for Vietnamese learners at CEFR level ${cefrLevel}.

Generate exactly ${themes.length} practice sets. One set per theme in this exact order:
${themes.map((t, i) => `${i + 1}. ${t}`).join('\n')}

═══ REQUIREMENTS PER SET ═══

PASSAGE: ${wordRange} words, engaging, appropriate vocabulary for ${cefrLevel}
QUESTIONS: Exactly 10 mcq_single questions testing comprehension of the passage
- 4 options each (plain strings)
- Exactly 1 correct answer per question
- correctIndex is 0-based (0=first option)
- Mix: main idea, detail, vocabulary in context, inference questions

═══ OUTPUT FORMAT ═══
Return ONLY valid JSON. No markdown. No extra text.

{
  "skill": "reading",
  "cefrLevel": "${cefrLevel}",
  "practiceSets": [
    {
      "title": "string — clear practice set title",
      "description": "string — 1 sentence describing what learners practice",
      "estimatedMinutes": ${mins},
      "passage": {
        "title": "string",
        "content": "string — full passage (${wordRange} words)",
        "wordCount": number,
        "topic": "string"
      },
      "questions": [
        {
          "stemText": "string",
          "options": ["option A", "option B", "option C", "option D"],
          "correctIndex": 0
        }
      ]
    }
  ]
}`;
}

function buildWritingPracticePrompt(cefrLevel: string, themes: string[]): string {
	const mins = cefrLevel === 'A1' ? 15 : cefrLevel === 'A2' ? 20 : cefrLevel === 'B1' ? 25 : 30;

	return `You are a senior English language curriculum designer creating standalone writing practice sets for Vietnamese learners at CEFR level ${cefrLevel}.

Generate exactly ${themes.length} practice sets. One set per theme in this exact order:
${themes.map((t, i) => `${i + 1}. ${t}`).join('\n')}

═══ REQUIREMENTS PER SET ═══

QUESTIONS: Exactly 10 fill_blank questions per set
- Each is a complete sentence with exactly ONE blank marked as ___
- Blank tests vocabulary or grammar relevant to the theme
- answerKeys: array of 1–2 acceptable answers
- Sentences appropriate for ${cefrLevel} level

═══ OUTPUT FORMAT ═══
Return ONLY valid JSON. No markdown. No extra text.

{
  "skill": "writing",
  "cefrLevel": "${cefrLevel}",
  "practiceSets": [
    {
      "title": "string",
      "description": "string — 1 sentence",
      "estimatedMinutes": ${mins},
      "questions": [
        {
          "stemText": "string — sentence with ONE ___ blank",
          "answerKeys": ["correct answer", "alternative if applicable"]
        }
      ]
    }
  ]
}`;
}

function buildSpeakingPracticePrompt(cefrLevel: string, themes: string[]): string {
	const mins = cefrLevel === 'A1' ? 15 : cefrLevel === 'A2' ? 20 : cefrLevel === 'B1' ? 25 : 30;
	const secRange =
		cefrLevel === 'A1' ? '30–45' : cefrLevel === 'A2' ? '45–60' : cefrLevel === 'B1' ? '60–90' : '90–120';
	const durSec = cefrLevel === 'A1' ? 38 : cefrLevel === 'A2' ? 53 : cefrLevel === 'B1' ? 75 : 105;

	return `You are a senior English language curriculum designer creating standalone speaking practice sets for Vietnamese learners at CEFR level ${cefrLevel}.

Generate exactly ${themes.length} practice sets. One set per theme in this exact order:
${themes.map((t, i) => `${i + 1}. ${t}`).join('\n')}

═══ REQUIREMENTS PER SET ═══

MCQ QUESTIONS: Exactly 8 mcq_single questions per set
- Test vocabulary, collocations, grammar relevant to the speaking theme
- 4 options each, 1 correct, correctIndex is 0-based

SPEAKING TASKS: Exactly 2 speaking tasks per set
- Task 1: structured/guided (describe, explain, list)
- Task 2: open/opinion-based (discuss, compare, argue)
- Each task: speak for ${secRange} seconds
- durationSeconds: ${durSec}

═══ OUTPUT FORMAT ═══
Return ONLY valid JSON. No markdown. No extra text.

{
  "skill": "speaking",
  "cefrLevel": "${cefrLevel}",
  "practiceSets": [
    {
      "title": "string",
      "description": "string — 1 sentence",
      "estimatedMinutes": ${mins},
      "mcqQuestions": [
        {
          "stemText": "string",
          "options": ["option A", "option B", "option C", "option D"],
          "correctIndex": 0
        }
      ],
      "speakingTasks": [
        {
          "prompt": "string — full task instruction with time guidance",
          "durationSeconds": ${durSec}
        }
      ]
    }
  ]
}`;
}

// ─── GENERATOR ────────────────────────────────────────────────────────────────

async function generateAndSave(skill: string, cefrLevel: string, force: boolean) {
	const outputPath = path.join(OUTPUT_DIR, `practice-${skill}-${cefrLevel}.json`);

	if (!force && fs.existsSync(outputPath)) {
		console.log(`⏭️  Skip (exists): practice-${skill}-${cefrLevel}.json`);
		return;
	}

	const themes = THEMES[skill][cefrLevel];
	console.log(`\n🔄 Generating: PRACTICE ${skill.toUpperCase()} ${cefrLevel} (${themes.length} sets)...`);

	let prompt: string;
	if (skill === 'reading') prompt = buildReadingPracticePrompt(cefrLevel, themes);
	else if (skill === 'writing') prompt = buildWritingPracticePrompt(cefrLevel, themes);
	else prompt = buildSpeakingPracticePrompt(cefrLevel, themes);

	// Retry up to 3 times
	let parsed: any = null;
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			const raw = await model.generateContent(prompt);
			const rawText = raw.response.text();
			parsed = JSON.parse(cleanJson(rawText));
			break;
		} catch (e) {
			console.warn(`  ⚠️  Attempt ${attempt}/3 failed: ${(e as Error).message}`);
			if (attempt < 3) {
				await delay(10000);
			} else {
				// Save raw for debugging
				const debugPath = outputPath.replace('.json', '.raw.txt');
				fs.writeFileSync(debugPath, (e as any)?.rawText ?? 'no raw', 'utf-8');
				throw e;
			}
		}
	}

	if (!parsed?.practiceSets || !Array.isArray(parsed.practiceSets)) {
		throw new Error(`Invalid structure: missing "practiceSets" array`);
	}

	// Dedup by title
	const seen = new Set<string>();
	parsed.practiceSets = parsed.practiceSets.filter((s: any) => {
		if (seen.has(s.title)) return false;
		seen.add(s.title);
		return true;
	});

	// Stats
	const count = parsed.practiceSets.length;
	if (skill === 'reading') {
		const totalQ = parsed.practiceSets.reduce((s: number, p: any) => s + (p.questions?.length ?? 0), 0);
		console.log(`  ✅ ${count} sets | ${totalQ} questions (avg ${(totalQ / count).toFixed(1)}/set)`);
	} else if (skill === 'writing') {
		const totalFill = parsed.practiceSets.reduce((s: number, p: any) => s + (p.questions?.length ?? 0), 0);
		console.log(`  ✅ ${count} sets | ${totalFill} fill_blank questions`);
	} else {
		const totalMcq = parsed.practiceSets.reduce((s: number, p: any) => s + (p.mcqQuestions?.length ?? 0), 0);
		const totalSpk = parsed.practiceSets.reduce((s: number, p: any) => s + (p.speakingTasks?.length ?? 0), 0);
		console.log(`  ✅ ${count} sets | ${totalMcq} MCQ + ${totalSpk} speaking tasks`);
	}

	fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	fs.writeFileSync(outputPath, JSON.stringify(parsed, null, 2), 'utf-8');
	console.log(`  💾 Saved: ${outputPath}`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
	const args = process.argv.slice(2);
	const force = args.includes('--force');
	const positional = args.filter((a) => a !== '--force');
	const skillArg = positional[0];
	const levelArg = positional[1];

	const skills = skillArg ? [skillArg] : ['reading', 'writing', 'speaking'];
	const levels = levelArg ? [levelArg] : ['A1', 'A2', 'B1', 'B2'];
	const combinations = skills.flatMap((s) => levels.map((l) => ({ skill: s, level: l })));

	console.log('🚀 LinguaPanda Practice Generator');
	console.log(
		`📦 Combinations: ${combinations.length} (${combinations.map((c) => `${c.skill}/${c.level}`).join(', ')})`,
	);
	console.log(`📁 Output dir: ${OUTPUT_DIR}`);
	console.log(`🔁 Force: ${force}\n`);

	if (!process.env.LLM_API_KEY) {
		console.error('❌ LLM_API_KEY not found!');
		process.exit(1);
	}

	let success = 0;
	let failed = 0;

	for (const { skill, level } of combinations) {
		try {
			await generateAndSave(skill, level, force);
			success++;
		} catch (e) {
			console.error(`❌ Failed: ${skill} ${level} — ${(e as Error).message}`);
			failed++;
		}

		if (success + failed < combinations.length) {
			console.log('  ⏳ Waiting 5s...');
			await delay(5000);
		}
	}

	console.log(`\n✅ Done! Success: ${success} | Failed: ${failed}`);
	console.log(`\nNext: pnpm exec tsx prisma/seeds/seed-practice-from-json.ts`);
}

main().catch((e) => {
	console.error('❌ Fatal:', e.message);
	process.exit(1);
});
