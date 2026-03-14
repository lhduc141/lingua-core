import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

/**
 * Seed placement test data vào PostgreSQL
 *
 * Phase 1: Reading passages (89 passages, 590 questions)
 *          → từ merged/passages-questions-seed.json
 *
 * Phase 2: Grammar questions (410 questions, passageId = null)
 *          → từ merged/grammar-seed.json
 *
 * Idempotent: chạy lại không bị duplicate
 * IRT:        b tính từ humanDifficulty + cefrLevel, a=1.0, c=0.25 cố định
 *
 * Usage: npx ts-node seed-placement.ts
 */

const prisma = new PrismaClient();

const IRT_A = 1.0; // discrimination — cố định (không có dữ liệu user để calibrate)
const IRT_C = 0.25; // guessing — cố định (4-option MCQ)

const IRT_B_RANGES: Record<string, { min: number; max: number }> = {
	A1: { min: -2.5, max: -2.1 },
	A2: { min: -1.25, max: -0.85 },
	B1: { min: -0.25, max: 0.15 },
	B2: { min: 0.75, max: 1.15 },
	C1: { min: 2.05, max: 2.25 },
};

const HUMAN_DIFFICULTY_RATIO: Record<string, number> = {
	very_easy: 0.0,
	easy: 0.25,
	medium: 0.5,
	moderate: 0.5,
	hard: 0.75,
	very_hard: 1.0,
};

function calcIrtB(cefrLevel: string, humanDifficulty: string): number {
	const range = IRT_B_RANGES[cefrLevel] ?? IRT_B_RANGES['B1'];
	const ratio = HUMAN_DIFFICULTY_RATIO[humanDifficulty] ?? 0.5;
	const b = range.min + ratio * (range.max - range.min);
	return Math.round(b * 1000) / 1000;
}

interface QuestionOption {
	text: string;
	isCorrect: boolean;
}

interface RawQuestion {
	questionNumber: number;
	skill: string;
	type: string;
	difficulty: number;
	humanDifficulty: string;
	cefrLevel: string;
	sourceTag: string;
	status: string;
	translations: {
		en: {
			stemText: string;
			options: QuestionOption[];
			explanation?: string;
		};
	};
}

interface RawPassage {
	passageMetadata: {
		level: string;
		passageNumber: number;
		wordCount: number;
		topic: string;
		difficulty: number;
	};
	passageText: string;
	questions: RawQuestion[];
}

interface PassageSeedFile {
	meta: { total_passages: number; total_questions: number };
	passages: RawPassage[];
}

interface GrammarSeedFile {
	meta: { total_questions: number };
	questions: RawQuestion[];
}

// ─── Core: seed 1 question ────────────────────────────────────────────────────
async function seedOneQuestion(q: RawQuestion, passageId: string | null): Promise<'created' | 'skipped'> {
	const stemText = q.translations?.en?.stemText;
	if (!stemText) return 'skipped';

	// Idempotency: skip nếu stemText + sourceTag đã tồn tại
	const exists = await prisma.question.findFirst({
		where: {
			sourceTag: q.sourceTag ?? 'placement_test_v1',
			translations: { some: { stemText, locale: 'en' } },
			deletedAt: null,
		},
		select: { questionId: true },
	});
	if (exists) return 'skipped';

	const irtB = calcIrtB(q.cefrLevel, q.humanDifficulty);

	const created = await prisma.question.create({
		data: {
			passageId,
			skill: q.skill as any,
			type: q.type as any,
			difficulty: q.difficulty,
			status: (q.status ?? 'published') as any,
			sourceTag: q.sourceTag ?? 'placement_test_v1',
			examKind: 'generic',
			irtDifficulty: irtB,
			irtDiscrimination: IRT_A,
			irtGuessing: IRT_C,
		},
	});

	await prisma.questionTranslation.create({
		data: {
			questionId: created.questionId,
			locale: 'en',
			stemText: q.translations.en.stemText,
			explanation: q.translations.en.explanation ?? null,
		},
	});

	for (const [i, opt] of q.translations.en.options.entries()) {
		const createdOpt = await prisma.questionOption.create({
			data: {
				questionId: created.questionId,
				isCorrect: opt.isCorrect,
				position: i + 1,
			},
		});
		await prisma.optionTranslation.create({
			data: {
				optionId: createdOpt.optionId,
				locale: 'en',
				optionText: opt.text,
			},
		});
	}

	return 'created';
}

// ─── Phase 1: Reading Passages
async function seedPassages(): Promise<void> {
	const seedFile = path.join(__dirname, 'merged', 'passages-questions-seed.json');
	if (!fs.existsSync(seedFile)) return;
	const data: PassageSeedFile = JSON.parse(fs.readFileSync(seedFile, 'utf-8'));

	let passagesCreated = 0;
	let passagesSkipped = 0;
	let qCreated = 0;
	let qSkipped = 0;

	for (const passageData of data.passages) {
		const level = passageData.passageMetadata.level;
		const topic = passageData.passageMetadata.topic;
		const title = `${level} - ${topic}`;

		// Idempotency: skip nếu passage đã tồn tại
		const existingPassage = await prisma.passage.findFirst({
			where: { title, sourceTag: 'placement_test_v1', deletedAt: null },
			select: { passageId: true },
		});

		if (existingPassage) {
			passagesSkipped++;
			continue;
		}

		let passage: { passageId: string };
		try {
			passage = await prisma.passage.create({
				data: {
					title,
					content: passageData.passageText,
					cefrLevel: level,
					topic,
					wordCount: passageData.passageMetadata.wordCount,
					sourceTag: 'placement_test_v1',
					status: 'published',
				},
				select: { passageId: true },
			});
			passagesCreated++;
		} catch (err) {
			continue;
		}

		for (const q of passageData.questions) {
			const result = await seedOneQuestion(q, passage.passageId);
			result === 'created' ? qCreated++ : qSkipped++;
		}
	}
}

// ─── Phase 2: Grammar Questions

async function seedGrammar(): Promise<void> {
	const seedFile = path.join(__dirname, 'merged', 'grammar-seed.json');
	if (!fs.existsSync(seedFile)) return;
	const data: GrammarSeedFile = JSON.parse(fs.readFileSync(seedFile, 'utf-8'));

	let created = 0;
	let skipped = 0;

	for (const q of data.questions) {
		const result = await seedOneQuestion(q, null);
		if (result === 'created') {
			created++;
			if (created % 50 === 0) console.log(`  ... ${created} grammar questions created`);
		} else skipped++;
	}
}

// ─── Main

async function main(): Promise<void> {
	console.log('🌱 LinguaPanda — Placement Test Seed');
	console.log(`IRT: a=${IRT_A} (fixed) · c=${IRT_C} (fixed) · b=heuristic per level`);

	await seedPassages();
	await seedGrammar();

	const [totalPassages, totalQuestions] = await Promise.all([
		prisma.passage.count({ where: { sourceTag: 'placement_test_v1', deletedAt: null } }),
		prisma.question.count({ where: { sourceTag: 'placement_test_v1', deletedAt: null } }),
	]);

	console.log('SEED HOÀN TẤT');
	console.log(`   DB passages:  ${totalPassages}`);
	console.log(`   DB questions: ${totalQuestions}`);
}

main()
	.catch((err) => {
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
