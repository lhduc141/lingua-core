import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const genAI = new GoogleGenerativeAI(process.env.LLM_API_KEY!);
const model = genAI.getGenerativeModel({
	model: process.env.LLM_MODEL || 'gemini-2.0-flash-lite',
	generationConfig: {
		maxOutputTokens: 32000,
		temperature: 0.4,
	},
});

const OUTPUT_DIR = path.resolve(__dirname, 'data');
const LESSONS_PER_BATCH = 20;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function cleanJson(raw: string): string {
	return raw
		.replace(/```json\s*/gi, '')
		.replace(/```\s*/g, '')
		.trim();
}

// ─── TOPIC LISTS (20 per skill/level) ────────────────────────────────────────
const TOPICS: Record<string, Record<string, string[]>> = {
	reading: {
		A1: [
			'My Family',
			'Pets and Animals',
			'Food I Like',
			'My School Day',
			'Colors and Shapes',
			'My Home',
			'The Weather',
			'Daily Routines',
			'Numbers and Time',
			'My Friends',
			'Going Shopping',
			'In the Park',
			'My Bedroom',
			'Fun at School',
			'Healthy Food',
			'Seasons of the Year',
			'A Birthday Party',
			'My Favorite Sport',
			'At the Zoo',
			'Weekend Plans',
		],
		A2: [
			'Shopping and Prices',
			'A Trip to the City',
			'My Hobbies',
			'Jobs and Workplaces',
			'Staying Healthy',
			'Sports and Fitness',
			'A Visit to a Museum',
			'Holiday Traditions',
			'Making New Friends',
			'Using Public Transport',
			'Cooking at Home',
			'My Favorite Film',
			'School Clubs',
			'Weekend Trips',
			'The Internet and Me',
			'A Pen Pal Letter',
			'Our Local Market',
			'Looking After Nature',
			'A News Story',
			'Learning a New Skill',
		],
		B1: [
			'Climate Change and Us',
			'Social Media Habits',
			'Education Around the World',
			'Work-Life Balance',
			'Traditional and Modern Medicine',
			'Traveling on a Budget',
			'Volunteering Experiences',
			'Popular Science Topics',
			'Cultural Differences in Food',
			'Starting a Small Business',
			'Mental Health Awareness',
			'Eco-Friendly Living',
			'Careers in Technology',
			'Reading the News Critically',
			'City vs. Countryside Living',
			'Learning a New Language',
			'The Future of Transport',
			'Famous Historical Events',
			'Streaming vs. Traditional TV',
			'Young Entrepreneurs',
		],
		B2: [
			'Globalization and Local Cultures',
			'The Ethics of Artificial Intelligence',
			'Income Inequality in Modern Society',
			'The Psychology of Decision-Making',
			'Political Participation of Young People',
			'The Role of Media in Democracy',
			'Scientific Advances in Medicine',
			'Literature and Social Change',
			'Corporate Responsibility and the Environment',
			'Urbanization and Its Challenges',
			'The Future of Work in the Digital Age',
			'Philosophical Perspectives on Happiness',
			'Language and Identity',
			'Behavioral Economics',
			'Renewable Energy Challenges',
			'Gender Equality in the Workplace',
			'International Migration Patterns',
			'Art as Social Commentary',
			'The Neuroscience of Learning',
			'Global Health Crises',
		],
	},
	writing: {
		A1: [
			'Introduce Yourself',
			'Describe Your Room',
			'Write About Your Family',
			'My Favorite Food',
			'Describe a Pet',
			'My School Day',
			'The Weather Today',
			'My Daily Routine',
			'Describe a Color',
			'My Best Friend',
			'Write a Short List',
			'My Favorite Animal',
			'Describe Your House',
			'A Short Thank-You Note',
			'My Favorite Game',
			'A Simple Postcard',
			'My Morning Routine',
			'Describe a Photo',
			'Write About Today',
			'Simple Numbers and Prices',
		],
		A2: [
			'Write About a Hobby',
			'Describe a Trip You Took',
			'My Dream Job',
			'Write a Simple Email to a Friend',
			'Plan a Holiday',
			'Describe a Healthy Day',
			'Write About a Memorable Day',
			'Describe a Place in Your City',
			'Weekend Activities',
			'Write a Short Diary Entry',
			'Describe Your Neighborhood',
			'A Review of a Restaurant',
			'Write About Your Morning Commute',
			'A Shopping List and Budget',
			'Describe a Festival',
			'Write About a Skill You Are Learning',
			'Compare Two Foods',
			'My Ideal Weekend',
			'Describe a Friend',
			'Write a Short Story Ending',
		],
		B1: [
			'Advantages of Learning Online',
			'Write a Formal Email to a Company',
			'Discuss Environmental Problems',
			'Write About Technology in Daily Life',
			'Describe a Cultural Tradition',
			'Pros and Cons of Social Media',
			'Write a Report on a School Event',
			'Describe Career Goals',
			'Write About a Challenge You Overcame',
			'A Review of a Book or Film',
			'Write About Healthy Habits',
			'Discuss City vs. Countryside Living',
			'Write a Cover Letter',
			'Describe a Trip Abroad',
			'Write About a Current News Event',
			'The Importance of Recycling',
			'Write About a Role Model',
			'Describe How Technology Has Changed Life',
			'Write About Work Experience',
			'My Opinion on Studying Abroad',
		],
		B2: [
			'Argumentative Essay: Social Media and Privacy',
			'Analyze a News Article',
			'Discuss an Ethical Dilemma at Work',
			'The Impact of Globalization on Culture',
			'Write a Critical Review of a Novel',
			'Science, Technology and Society',
			'Write About Social Inequality',
			'Propose a Business Idea',
			'Psychological Concepts in Everyday Life',
			'Art and Its Role in Society',
			'Write About Sustainable Development',
			'A Discursive Essay on Immigration',
			'Discuss AI in Education',
			'Critique a Political Policy',
			'Write a Formal Report on Urban Growth',
			'Analyze Advertising and Consumer Behavior',
			'Write About the Ethics of Scientific Research',
			'Discuss Democracy and Youth Participation',
			'Write a Position Paper on Climate Change',
			'Essay: The Role of Language in Identity',
		],
	},
	speaking: {
		A1: [
			'Greet and Introduce Yourself',
			'Talk About Your Family',
			'Describe Your Home',
			'Your Favorite Food',
			'Describe a Pet or Animal',
			'Talk About School',
			'Describe the Weather',
			'Your Daily Routine',
			'Describe Colors Around You',
			'Talk About a Friend',
			'Your Favorite Game',
			'Describe Your Room',
			'Talk About a Weekend Activity',
			'Describe a Photo',
			'Numbers in Daily Life',
			'Talk About Your Morning',
			'Describe a Simple Story',
			'Your Favorite Place',
			'Greet Someone New',
			'Talk About Today',
		],
		A2: [
			'Talk About a Hobby',
			'Describe a Journey or Trip',
			'Your Dream Job',
			'Talk About Health and Exercise',
			'Your Favorite Sport',
			'A Shopping Experience',
			'Describe Your Neighborhood',
			'Holiday Traditions in Vietnam',
			'Talk About a Good Friend',
			'How You Get Around',
			'Discuss a Film or Series',
			'Describe a Restaurant or Café',
			'Talk About School Clubs',
			'Compare Two Activities',
			'Describe a Skill You Are Learning',
			'Talk About Helping Others',
			'Describe a Market or Festival',
			'Your Opinion on the Internet',
			'Plan a Trip Together',
			'Weekend Plans',
		],
		B1: [
			'Discuss Environmental Issues',
			'Technology: Pros and Cons',
			'Cultural Differences You Have Noticed',
			'Education in Vietnam vs. Abroad',
			'Describe a Work or Volunteer Experience',
			'Talk About Health Trends',
			'Discuss a Recent News Story',
			'Relationships and Communication',
			'How You Manage Money',
			'Leisure Activities and Well-being',
			'Discuss Social Media',
			'Talk About Career Goals',
			'Describe a Challenge You Faced',
			'Talk About Sustainable Living',
			'Compare City and Countryside Life',
			'Discuss the Role of Technology in Learning',
			'Talk About a Role Model',
			'Describe a Cultural Event',
			'Your Opinion on Working from Home',
			'Talk About Future Plans',
		],
		B2: [
			'Debate: Social Media and Mental Health',
			'Analyze Bias in the News',
			'Discuss an Ethical Issue at Work',
			'Effects of Globalization on Vietnam',
			'Science and Its Impact on Daily Life',
			'Business Ideas and Innovation',
			'Youth Political Participation',
			'Discuss a Piece of Literature or Art',
			'Social Inequality and Its Solutions',
			'The Future of Work and AI',
			'Discuss Immigration and Identity',
			'Psychology and Human Behavior',
			'Analyze an Advertisement',
			'Discuss the Ethics of AI',
			'Sustainable Development Goals',
			'Discuss Democracy in the Modern Age',
			'Language and Cultural Identity',
			'Climate Change: Individual vs. Systemic Action',
			'Art as a Tool for Social Change',
			'Debate: Remote Work vs. Office Work',
		],
	},
};

// ─── PROMPT BUILDERS ──────────────────────────────────────────────────────────

function buildReadingPrompt(cefrLevel: string, topics: string[]): string {
	const wordRange =
		cefrLevel === 'A1' ? '60–100' : cefrLevel === 'A2' ? '100–150' : cefrLevel === 'B1' ? '160–220' : '220–300';
	const mins = cefrLevel === 'A1' ? 15 : cefrLevel === 'A2' ? 20 : cefrLevel === 'B1' ? 25 : 30;

	return `You are a senior English language curriculum designer creating high-quality lessons for Vietnamese learners at CEFR level ${cefrLevel}.

Generate exactly ${topics.length} reading lessons. One lesson per topic in this exact order:
${topics.map((t, i) => `${i + 1}. ${t}`).join('\n')}

═══ REQUIREMENTS PER LESSON ═══

PASSAGE:
- ${wordRange} words, authentic-sounding, engaging
- Topic must match the assigned topic
- Vocabulary and grammar strictly at ${cefrLevel} level
- Vietnamese learners context: use familiar, relatable situations

THEORY CONTENT (3–4 sections teaching a reading skill):
Section types: "rule" (explain a concept), "example" (show an example), "tip" (practical advice)
Focus on skills like: skimming, scanning, vocabulary in context, understanding main idea, inference

QUESTIONS (8 per lesson, all mcq_single):
- Questions test comprehension of the PASSAGE (not general knowledge)
- 4 options each (A, B, C, D format as plain strings)
- Exactly 1 correct answer
- Mix question types: main idea, detail, vocabulary in context, inference
- correctIndex is 0-based (0=A, 1=B, 2=C, 3=D)

═══ OUTPUT FORMAT ═══
Return ONLY valid JSON. No markdown. No explanation. No extra text before or after.

{
  "skill": "reading",
  "cefrLevel": "${cefrLevel}",
  "lessons": [
    {
      "title": "string — clear, descriptive lesson title",
      "description": "string — 1–2 sentences: what learners will practice in this lesson",
      "estimatedMinutes": ${mins},
      "theoryContent": {
        "sections": [
          { "type": "rule|example|tip", "heading": "string", "content": "string — 2–4 sentences" }
        ]
      },
      "passage": {
        "title": "string — title of the reading text",
        "content": "string — full passage text (${wordRange} words)",
        "wordCount": number,
        "topic": "string — topic keyword"
      },
      "questions": [
        {
          "stemText": "string — full question text",
          "options": ["option text A", "option text B", "option text C", "option text D"],
          "correctIndex": 0
        }
      ]
    }
  ]
}`;
}

function buildWritingPrompt(cefrLevel: string, topics: string[]): string {
	const mins = cefrLevel === 'A1' ? 20 : cefrLevel === 'A2' ? 25 : cefrLevel === 'B1' ? 30 : 35;
	const fillCount = cefrLevel === 'A1' ? 6 : cefrLevel === 'A2' ? 5 : 4;
	const essayCount = cefrLevel === 'A1' ? 1 : cefrLevel === 'A2' ? 1 : 2;
	const wordTarget =
		cefrLevel === 'A1' ? '30–50' : cefrLevel === 'A2' ? '60–90' : cefrLevel === 'B1' ? '120–180' : '200–280';

	return `You are a senior English language curriculum designer creating high-quality lessons for Vietnamese learners at CEFR level ${cefrLevel}.

Generate exactly ${topics.length} writing lessons. One lesson per topic in this exact order:
${topics.map((t, i) => `${i + 1}. ${t}`).join('\n')}

═══ REQUIREMENTS PER LESSON ═══

THEORY CONTENT (3–4 sections teaching a writing skill):
Section types: "rule" (grammar/writing rule), "example" (show correct vs incorrect), "tip" (practical writing advice)
Focus on: sentence structure, cohesion, vocabulary choice, paragraph organization, grammar for ${cefrLevel}

FILL-IN-THE-BLANK QUESTIONS (${fillCount} per lesson):
- Full sentence with exactly ONE blank marked as ___
- Blank tests vocabulary or grammar relevant to the topic
- answerKeys: array with 1–2 acceptable answers (synonyms allowed)
- Sentence must make clear contextual sense at ${cefrLevel} level

ESSAY PROMPTS (${essayCount} per lesson):
- Clear, specific writing task instruction
- Target: ${wordTarget} words
- Appropriate complexity for ${cefrLevel} learner
- For A1/A2: personal, descriptive tasks
- For B1/B2: opinion, discussion, or formal writing tasks

═══ OUTPUT FORMAT ═══
Return ONLY valid JSON. No markdown. No explanation. No extra text.

{
  "skill": "writing",
  "cefrLevel": "${cefrLevel}",
  "lessons": [
    {
      "title": "string",
      "description": "string — 1–2 sentences",
      "estimatedMinutes": ${mins},
      "theoryContent": {
        "sections": [
          { "type": "rule|example|tip", "heading": "string", "content": "string" }
        ]
      },
      "fillBlanks": [
        {
          "stemText": "string — sentence with ONE ___ blank",
          "answerKeys": ["correct answer", "alternative if any"]
        }
      ],
      "essays": [
        {
          "prompt": "string — full writing task instruction",
          "minWords": number,
          "maxWords": number
        }
      ]
    }
  ]
}`;
}

function buildSpeakingPrompt(cefrLevel: string, topics: string[]): string {
	const mins = cefrLevel === 'A1' ? 15 : cefrLevel === 'A2' ? 20 : cefrLevel === 'B1' ? 25 : 30;
	const secRange =
		cefrLevel === 'A1' ? '30–45' : cefrLevel === 'A2' ? '45–60' : cefrLevel === 'B1' ? '60–90' : '90–120';

	return `You are a senior English language curriculum designer creating high-quality lessons for Vietnamese learners at CEFR level ${cefrLevel}.

Generate exactly ${topics.length} speaking lessons. One lesson per topic in this exact order:
${topics.map((t, i) => `${i + 1}. ${t}`).join('\n')}

═══ REQUIREMENTS PER LESSON ═══

THEORY CONTENT (3–4 sections teaching a speaking skill):
Section types: "rule" (pronunciation/fluency rule), "example" (model answer or phrase), "tip" (practical speaking advice)
Focus on: pronunciation tips, useful phrases, conversation strategies, discourse markers, fluency building at ${cefrLevel}

MCQ QUESTIONS (3 per lesson — test vocabulary/grammar used in speaking):
- Test vocabulary, collocations, or grammar structures relevant to the speaking topic
- 4 options each
- 1 correct answer
- correctIndex is 0-based

SPEAKING TASKS (2 per lesson):
- Clear, specific prompt telling learner EXACTLY what to talk about
- Mention length: speak for ${secRange} seconds
- Appropriate complexity for ${cefrLevel}
- Task 1: more structured/guided (describe, list, explain)
- Task 2: more open/opinion-based (discuss, compare, argue)
- durationSeconds: use midpoint of ${secRange} range

═══ OUTPUT FORMAT ═══
Return ONLY valid JSON. No markdown. No explanation. No extra text.

{
  "skill": "speaking",
  "cefrLevel": "${cefrLevel}",
  "lessons": [
    {
      "title": "string",
      "description": "string — 1–2 sentences",
      "estimatedMinutes": ${mins},
      "theoryContent": {
        "sections": [
          { "type": "rule|example|tip", "heading": "string", "content": "string" }
        ]
      },
      "mcqQuestions": [
        {
          "stemText": "string",
          "options": ["option A", "option B", "option C", "option D"],
          "correctIndex": 0
        }
      ],
      "speakingTasks": [
        {
          "prompt": "string — full task instruction including time guidance",
          "durationSeconds": number
        }
      ]
    }
  ]
}`;
}

// ─── GENERATOR ────────────────────────────────────────────────────────────────
async function generateAndSave(skill: string, cefrLevel: string, force: boolean) {
	const outputPath = path.join(OUTPUT_DIR, `lessons-${skill}-${cefrLevel}.json`);

	if (!force && fs.existsSync(outputPath)) {
		console.log(`⏭️  Skip (already exists): lessons-${skill}-${cefrLevel}.json`);
		return;
	}

	const topics = TOPICS[skill][cefrLevel];
	console.log(`\n🔄 Generating: ${skill.toUpperCase()} ${cefrLevel} (${topics.length} lessons)...`);

	let prompt: string;
	if (skill === 'reading') prompt = buildReadingPrompt(cefrLevel, topics);
	else if (skill === 'writing') prompt = buildWritingPrompt(cefrLevel, topics);
	else prompt = buildSpeakingPrompt(cefrLevel, topics);

	const raw = await model.generateContent(prompt);
	const rawText = raw.response.text();

	let parsed: any;
	try {
		parsed = JSON.parse(cleanJson(rawText));
	} catch (e) {
		// Save raw for debugging
		const debugPath = outputPath.replace('.json', '.raw.txt');
		fs.writeFileSync(debugPath, rawText, 'utf-8');
		throw new Error(
			`JSON parse failed for ${skill} ${cefrLevel}. Raw saved to ${debugPath}. Error: ${(e as Error).message}`,
		);
	}

	// Validate structure
	if (!parsed.lessons || !Array.isArray(parsed.lessons)) {
		throw new Error(`Invalid structure: missing "lessons" array for ${skill} ${cefrLevel}`);
	}

	console.log(`  ✅ ${parsed.lessons.length} lessons generated`);

	// Log basic stats
	if (skill === 'reading') {
		const totalQ = parsed.lessons.reduce((s: number, l: any) => s + (l.questions?.length ?? 0), 0);
		console.log(`  📊 Questions: ${totalQ} (avg ${(totalQ / parsed.lessons.length).toFixed(1)}/lesson)`);
	} else if (skill === 'writing') {
		const totalFill = parsed.lessons.reduce((s: number, l: any) => s + (l.fillBlanks?.length ?? 0), 0);
		const totalEssay = parsed.lessons.reduce((s: number, l: any) => s + (l.essays?.length ?? 0), 0);
		console.log(`  📊 Fill-blanks: ${totalFill} | Essays: ${totalEssay}`);
	} else {
		const totalMcq = parsed.lessons.reduce((s: number, l: any) => s + (l.mcqQuestions?.length ?? 0), 0);
		const totalSpk = parsed.lessons.reduce((s: number, l: any) => s + (l.speakingTasks?.length ?? 0), 0);
		console.log(`  📊 MCQ: ${totalMcq} | Speaking tasks: ${totalSpk}`);
	}

	fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	fs.writeFileSync(outputPath, JSON.stringify(parsed, null, 2), 'utf-8');
	console.log(`  💾 Saved: ${outputPath}`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
	const args = process.argv.slice(2);
	const force = args.includes('--force');

	// Filter args: remove --force flag
	const positional = args.filter((a) => a !== '--force');
	const skillArg = positional[0]; // e.g. "reading"
	const levelArg = positional[1]; // e.g. "A1"

	const skills = skillArg ? [skillArg] : ['reading', 'writing', 'speaking'];
	const levels = levelArg ? [levelArg] : ['A1', 'A2', 'B1', 'B2'];

	const combinations = skills.flatMap((s) => levels.map((l) => ({ skill: s, level: l })));

	if (!process.env.LLM_API_KEY) {
		console.error('❌ LLM_API_KEY not found in environment!');
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

		// Delay between calls to respect rate limits
		if (success + failed < combinations.length) {
			console.log('  ⏳ Waiting 5s before next call...');
			await delay(5000);
		}
	}

	console.log(`Done! Success: ${success} | Failed: ${failed}`);
	console.log(`JSON files saved in: ${OUTPUT_DIR}`);
	console.log(`\nNext step:`);
	console.log(`  pnpm exec tsx prisma/seeds/seed-from-json.ts`);
}

main().catch((e) => {
	console.error('❌ Fatal:', e.message);
	process.exit(1);
});
