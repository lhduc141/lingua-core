import * as fs from 'fs';
import * as path from 'path';

/**
 * Merge tất cả reading passage batch files thành 1 file seed duy nhất
 * Input:  generated/batch1-a1.json ... batch9-c1.json
 * Output: merged/passages-questions-seed.json
 * Usage:  npx ts-node merge-batch-passage.ts
 */

interface QuestionOption {
	text: string;
	isCorrect: boolean;
}

interface Question {
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

interface Passage {
	passageMetadata: {
		level: string;
		passageNumber: number;
		wordCount: number;
		topic: string;
		difficulty: number;
	};
	passageText: string;
	questions: Question[];
}

interface BatchData {
	level: string;
	passages: Passage[];
}

interface CompleteSeedData {
	meta: {
		total_passages: number;
		total_questions: number;
		distribution: Record<string, { passages: number; questions: number }>;
		version: string;
		generated_date: string;
	};
	passages: Passage[];
}

// Word count ranges per CEFR level (warning only, không block)
const WORD_COUNT_RANGES: Record<string, { min: number; max: number }> = {
	A1: { min: 50, max: 80 },
	A2: { min: 85, max: 130 },
	B1: { min: 140, max: 190 },
	B2: { min: 190, max: 250 },
	C1: { min: 240, max: 310 },
};

// Tất cả 9 batch files theo thứ tự
const BATCH_FILES = [
	'batch1-a1.json',
	'batch2-a2.json',
	'batch3-b1.json',
	'batch4-b2c1.json',
	'batch5-a1.json',
	'batch6-a2.json',
	'batch7-b1.json',
	'batch8-b2.json',
	'batch9-c1.json',
];

async function mergeBatches(): Promise<void> {
	console.log('🔄 Merging reading passage batch files...\n');

	const inputDir = path.join(__dirname, 'generated');
	const outputDir = path.join(__dirname, 'merged');
	const outputFile = path.join(outputDir, 'passages-questions-seed.json');

	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
		console.log('📁 Created folder: merged/\n');
	}

	const allPassages: Passage[] = [];
	const distribution: Record<string, { passages: number; questions: number }> = {};
	let totalQuestions = 0;
	let warningCount = 0;

	for (const batchFile of BATCH_FILES) {
		const filePath = path.join(inputDir, batchFile);

		if (!fs.existsSync(filePath)) {
			console.warn(`File not found: ${batchFile} — skipping`);
			continue;
		}

		let raw: string;
		try {
			raw = fs.readFileSync(filePath, 'utf-8');
		} catch {
			console.error(`Cannot read: ${batchFile}`);
			continue;
		}

		let parsed: BatchData | { batches: BatchData[] };
		try {
			parsed = JSON.parse(raw);
		} catch {
			console.error(`Invalid JSON in: ${batchFile}`);
			continue;
		}

		const batches: BatchData[] = 'batches' in parsed ? parsed.batches : [parsed as BatchData];
		for (const batch of batches) {
			const level = batch.level;
			let questionsInBatch = 0;

			for (const passage of batch.passages) {
				if (!passage.passageText || !Array.isArray(passage.questions) || passage.questions.length === 0) {
					warningCount++;
					continue;
				}

				const wordCount = passage.passageText.split(/\s+/).filter(Boolean).length;
				const range = WORD_COUNT_RANGES[level];
				if (range && (wordCount < range.min || wordCount > range.max)) warningCount++;

				for (const q of passage.questions) {
					const opts = q.translations?.en?.options;
					if (!opts || opts.length !== 4) warningCount++;
					else {
						const correctCount = opts.filter((o) => o.isCorrect).length;
						if (correctCount !== 1) warningCount++;
					}
				}

				allPassages.push(passage);
				questionsInBatch += passage.questions.length;
			}

			if (!distribution[level]) distribution[level] = { passages: 0, questions: 0 };
			distribution[level].passages += batch.passages.length;
			distribution[level].questions += questionsInBatch;
			totalQuestions += questionsInBatch;
		}
	}

	['A1', 'A2', 'B1', 'B2', 'C1'].forEach((lvl) => {
		const s = distribution[lvl];
		if (s) console.log(`    ${lvl}: ${s.passages} passages, ${s.questions} questions`);
	});

	const seedData: CompleteSeedData = {
		meta: {
			total_passages: allPassages.length,
			total_questions: totalQuestions,
			distribution,
			version: '2.0',
			generated_date: new Date().toISOString().split('T')[0],
		},
		passages: allPassages,
	};

	fs.writeFileSync(outputFile, JSON.stringify(seedData, null, 2), 'utf-8');
}

mergeBatches().catch((err) => {
	console.error('Merge thất bại:', err);
	process.exit(1);
});
