/**
 * seed-listening.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Seeds all listening lessons + practice question sets from JSON files.
 *
 * Usage:
 *   pnpm exec tsx prisma/seeds/seed-listening.ts
 *
 * Prerequisites:
 *   1. pnpm prisma migrate dev --name add_listening_skill_audio_url
 *   2. Audio files uploaded to VPS and manifest.json generated
 *   3. JSON seeds in prisma/seeds/data/listening/<level>/{lessons,practice}.json
 *
 * Idempotent: skips items whose sourceTag already exists in DB.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// File structure: prisma/seeds/listening/data/a1_lessons.json, a1_practice.json ...
// seed-listening.ts is placed in: prisma/seeds/listening/

const SEEDS_DIR = path.resolve(__dirname, 'data');
const MANIFEST = path.resolve(__dirname, 'audio_output/manifest.json');
const LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1'] as const;

const CEFR_DIFFICULTY: Record<string, number> = {
	A1: 1,
	A2: 2,
	B1: 3,
	B2: 4,
	C1: 5,
	C2: 6,
};

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface ScriptLine {
	speaker: string;
	voice: string;
	text: string;
}

interface McqQuestion {
	type: 'mcq_single';
	stemText: string;
	options: string[];
	answer: string;
	explanation?: string;
}

interface FillBlankQuestion {
	type: 'fill_blank';
	stemText: string;
	answer: string;
	explanation?: string;
}

interface MatchingPair {
	left: string;
	right: string;
}

interface MatchingQuestion {
	type: 'matching';
	stemText: string;
	pairs: MatchingPair[];
	answers: Record<string, string>;
}

type SeedQuestion = McqQuestion | FillBlankQuestion | MatchingQuestion;

interface ListeningItem {
	id: string;
	type: 'lesson' | 'practice';
	cefrLevel: string;
	title: string;
	description?: string;
	topic?: string;
	estimatedMinutes?: number;
	script: ScriptLine[];
	fullScript: string;
	questions: SeedQuestion[];
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function loadManifest(): Record<string, { url: string }> {
	if (!fs.existsSync(MANIFEST)) {
		console.warn('⚠  manifest.json not found — audioUrl will be null');
		return {};
	}
	return JSON.parse(fs.readFileSync(MANIFEST, 'utf-8'));
}

function loadJson(filePath: string): ListeningItem[] {
	if (!fs.existsSync(filePath)) return [];
	return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

async function itemExists(sourceTag: string): Promise<boolean> {
	const count = await prisma.passage.count({ where: { sourceTag, deletedAt: null } });
	return count > 0;
}

// ─── QUESTION INSERTERS ───────────────────────────────────────────────────────

async function insertMcqQuestion(q: McqQuestion, cefrLevel: string, passageId: string): Promise<string> {
	const question = await prisma.question.create({
		data: {
			type: 'mcq_single' as any,
			skill: 'listening',
			difficulty: CEFR_DIFFICULTY[cefrLevel] ?? 1,
			status: 'published' as any,
			maxScore: 1,
			passageId,
			sourceTag: null,
		},
	});

	await prisma.questionTranslation.create({
		data: {
			questionId: question.questionId,
			locale: 'en',
			stemText: q.stemText,
			explanation: q.explanation ?? null,
		},
	});

	for (let i = 0; i < q.options.length; i++) {
		const opt = await prisma.questionOption.create({
			data: {
				questionId: question.questionId,
				isCorrect: q.options[i] === q.answer,
				position: i + 1,
			},
		});
		await prisma.optionTranslation.create({
			data: { optionId: opt.optionId, locale: 'en', optionText: q.options[i] },
		});
	}

	return question.questionId;
}

async function insertFillBlankQuestion(q: FillBlankQuestion, cefrLevel: string, passageId: string): Promise<string> {
	const question = await prisma.question.create({
		data: {
			type: 'fill_blank' as any,
			skill: 'listening',
			difficulty: CEFR_DIFFICULTY[cefrLevel] ?? 1,
			status: 'published' as any,
			maxScore: 1,
			passageId,
		},
	});

	await prisma.questionTranslation.create({
		data: {
			questionId: question.questionId,
			locale: 'en',
			stemText: q.stemText,
			explanation: q.explanation ?? null,
		},
	});

	// answerKeysJson: array of acceptable answers (lowercase for case-insensitive matching)
	await prisma.questionPayload.create({
		data: {
			questionId: question.questionId,
			answerKeysJson: [q.answer, q.answer.toLowerCase()].filter(
				(v, i, arr) => arr.indexOf(v) === i, // deduplicate
			),
		},
	});

	return question.questionId;
}

async function insertMatchingQuestion(q: MatchingQuestion, cefrLevel: string, passageId: string): Promise<string> {
	const question = await prisma.question.create({
		data: {
			type: 'matching' as any,
			skill: 'listening',
			difficulty: CEFR_DIFFICULTY[cefrLevel] ?? 1,
			status: 'published' as any,
			maxScore: q.pairs.length, // 1 point per correct pair
			passageId,
		},
	});

	await prisma.questionTranslation.create({
		data: { questionId: question.questionId, locale: 'en', stemText: q.stemText },
	});

	// Store pairs in configJson, correct mapping in answerKeysJson
	await prisma.questionPayload.create({
		data: {
			questionId: question.questionId,
			configJson: {
				pairs: q.pairs as any,
				leftLabels: q.pairs.map((p) => p.left),
				rightLabels: q.pairs.map((p) => p.right),
			} as any,
			answerKeysJson: q.answers as any,
		},
	});

	return question.questionId;
}

async function insertQuestion(q: SeedQuestion, cefrLevel: string, passageId: string): Promise<string> {
	switch (q.type) {
		case 'mcq_single':
			return insertMcqQuestion(q, cefrLevel, passageId);
		case 'fill_blank':
			return insertFillBlankQuestion(q, cefrLevel, passageId);
		case 'matching':
			return insertMatchingQuestion(q, cefrLevel, passageId);
		default:
			throw new Error(`Unknown question type: ${(q as any).type}`);
	}
}

// ─── MAIN SEEDER ─────────────────────────────────────────────────────────────

async function seedListeningLesson(item: ListeningItem, audioUrl: string | null): Promise<void> {
	const difficulty = CEFR_DIFFICULTY[item.cefrLevel] ?? 1;
	// Fallback: build fullScript from script array if field is missing
	const fullScript = item.fullScript ?? item.script.map((l) => `${l.speaker}: ${l.text}`).join('\n');

	// 1. Create Passage (holds script text + audio URL)
	const passage = await prisma.passage.create({
		data: {
			title: item.title,
			content: fullScript,
			audioUrl: audioUrl,
			cefrLevel: item.cefrLevel,
			topic: item.topic ?? null,
			sourceTag: item.id,
			status: 'published' as any,
			wordCount: fullScript.split(/\s+/).length,
		},
	});

	// 2. Create all Questions linked to this Passage
	const questionIds: string[] = [];
	for (const q of item.questions) {
		const qId = await insertQuestion(q, item.cefrLevel, passage.passageId);
		questionIds.push(qId);
	}

	// 3. Create Lesson
	const lesson = await prisma.lesson.create({
		data: {
			skillName: 'listening' as any,
			title: item.title,
			description: item.description ?? null,
			cefrLevel: item.cefrLevel,
			estimatedMinutes: item.estimatedMinutes ?? 10,
			status: 'published' as any,
		},
	});

	// 4. Link Questions → Lesson
	for (let i = 0; i < questionIds.length; i++) {
		await prisma.lessonQuestion.create({
			data: {
				lessonId: lesson.lessonId,
				questionId: questionIds[i],
				position: i + 1,
			},
		});
	}

	console.log(`    ✅ Lesson: "${item.title}" | ${questionIds.length}Q | passageId=${passage.passageId}`);
}

async function seedListeningPractice(item: ListeningItem, audioUrl: string | null): Promise<void> {
	// Fallback: build fullScript from script array if field is missing
	const fullScript = item.fullScript ?? item.script.map((l) => `${l.speaker}: ${l.text}`).join('\n');

	// 1. Create Passage
	const passage = await prisma.passage.create({
		data: {
			title: item.title,
			content: fullScript,
			audioUrl: audioUrl,
			cefrLevel: item.cefrLevel,
			topic: item.topic ?? null,
			sourceTag: item.id,
			status: 'published' as any,
			wordCount: fullScript.split(/\s+/).length,
		},
	});

	// 2. Create Questions
	const questionIds: string[] = [];
	for (const q of item.questions) {
		const qId = await insertQuestion(q, item.cefrLevel, passage.passageId);
		questionIds.push(qId);
	}

	// 3. Create QuestionSet
	const qs = await prisma.questionSet.create({
		data: {
			skillName: 'listening' as any,
			title: item.title,
			description: item.description ?? null,
			cefrLevel: item.cefrLevel,
			estimatedMinutes: item.estimatedMinutes ?? 15,
			isActive: true,
		},
	});

	// 4. Link Questions → QuestionSet
	for (let i = 0; i < questionIds.length; i++) {
		await prisma.questionSetItem.create({
			data: {
				questionSetId: qs.questionSetId,
				questionId: questionIds[i],
				position: i + 1,
			},
		});
	}

	console.log(`    ✅ Practice: "${item.title}" | ${questionIds.length}Q | passageId=${passage.passageId}`);
}

async function seedItem(item: ListeningItem, manifest: Record<string, { url: string }>): Promise<void> {
	// Idempotency check
	if (await itemExists(item.id)) {
		console.log(`    ⏭  Skip (exists): ${item.id}`);
		return;
	}

	const audioUrl = manifest[item.id]?.url ?? null;

	if (item.type === 'lesson') {
		await seedListeningLesson(item, audioUrl);
	} else {
		await seedListeningPractice(item, audioUrl);
	}
}

async function main(): Promise<void> {
	console.log('');
	console.log('══════════════════════════════════════════════════════');
	console.log('  LinguaPanda — Listening Content Seed');
	console.log('══════════════════════════════════════════════════════');
	console.log('');

	const manifest = loadManifest();
	console.log(`📋 Manifest entries: ${Object.keys(manifest).length}`);

	let totalSeeded = 0;
	let totalSkipped = 0;
	let totalErrors = 0;

	for (const level of LEVELS) {
		for (const fileType of ['lessons', 'practice'] as const) {
			// Flat naming: data/a1_lessons.json, data/a1_practice.json
			const filePath = path.join(SEEDS_DIR, `${level}_${fileType}.json`);
			const items = loadJson(filePath);

			if (items.length === 0) {
				console.warn(`⚠  Empty or missing: ${filePath}`);
				continue;
			}

			console.log(`\n${'─'.repeat(50)}`);
			console.log(`  ${level.toUpperCase()} ${fileType.toUpperCase()} (${items.length} items)`);
			console.log(`${'─'.repeat(50)}`);

			for (const item of items) {
				try {
					const existsBefore = await itemExists(item.id);
					await seedItem(item, manifest);
					if (existsBefore) {
						totalSkipped++;
					} else {
						totalSeeded++;
					}
				} catch (err: any) {
					console.error(`    ❌ Error seeding ${item.id}: ${err.message}`);
					totalErrors++;
				}
			}
		}
	}

	console.log('');
	console.log('══════════════════════════════════════════════════════');
	console.log(`  ✅ Seeded:  ${totalSeeded}`);
	console.log(`  ⏭  Skipped: ${totalSkipped}`);
	console.log(`  ❌ Errors:  ${totalErrors}`);
	console.log('══════════════════════════════════════════════════════');
	console.log('');
}

main()
	.catch((e) => {
		console.error('Fatal error:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
