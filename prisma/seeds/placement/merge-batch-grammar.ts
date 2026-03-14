import * as fs from 'fs';
import * as path from 'path';

/**
 * Merge tất cả grammar batch files thành 1 file seed duy nhất
 * Input:  generated/grammar-g1-a1.json ... grammar-c1-2.json
 * Output: merged/grammar-seed.json
 * Usage:  npx ts-node merge-batch-grammar.ts
 */

interface QuestionOption {
	text: string;
	isCorrect: boolean;
}

interface GrammarQuestion {
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

interface GrammarBatch {
	level: string;
	type: 'grammar';
	questions: GrammarQuestion[];
}

interface GrammarSeedData {
	meta: {
		total_questions: number;
		distribution: Record<string, number>;
		version: string;
		generated_date: string;
	};
	questions: GrammarQuestion[];
}

// 10 grammar batch files theo thứ tự
// A1 dùng tên grammar-g1-a1 / grammar-g2-a1 (đặt tên lúc generate)
// A2–C1 dùng tên grammar-{level}-{batch}
const GRAMMAR_FILES: Array<{ file: string; level: string }> = [
	{ file: 'grammar-g1-a1.json', level: 'A1' },
	{ file: 'grammar-g2-a1.json', level: 'A1' },
	{ file: 'grammar-a2-1.json', level: 'A2' },
	{ file: 'grammar-a2-2.json', level: 'A2' },
	{ file: 'grammar-b1-1.json', level: 'B1' },
	{ file: 'grammar-b1-2.json', level: 'B1' },
	{ file: 'grammar-b2-1.json', level: 'B2' },
	{ file: 'grammar-b2-2.json', level: 'B2' },
	{ file: 'grammar-c1-1.json', level: 'C1' },
	{ file: 'grammar-c1-2.json', level: 'C1' },
];

async function mergeGrammarBatches(): Promise<void> {
	const inputDir = path.join(__dirname, 'generated');
	const outputDir = path.join(__dirname, 'merged');
	const outputFile = path.join(outputDir, 'grammar-seed.json');

	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
		console.log('📁 Created folder: merged/\n');
	}

	const allQuestions: GrammarQuestion[] = [];
	const distribution: Record<string, number> = {};
	let warningCount = 0;

	for (const { file, level } of GRAMMAR_FILES) {
		const filePath = path.join(inputDir, file);

		let raw: string;
		try {
			raw = fs.readFileSync(filePath, 'utf-8');
		} catch {
			continue;
		}

		let batch: GrammarBatch;
		try {
			batch = JSON.parse(raw);
		} catch {
			continue;
		}

		for (const q of batch.questions) {
			if (!q.translations?.en?.stemText) {
				warningCount++;
				continue;
			}

			const opts = q.translations?.en?.options;
			if (!opts || opts.length !== 4) warningCount++;
			else {
				const correctCount = opts.filter((o) => o.isCorrect).length;
				if (correctCount !== 1) warningCount++;
			}
			q.cefrLevel = level;
			allQuestions.push(q);
		}
		distribution[level] = (distribution[level] ?? 0) + batch.questions.length;
	}
	['A1', 'A2', 'B1', 'B2', 'C1'].forEach((lvl) => {
		const count = distribution[lvl] ?? 0;
		if (count > 0) console.log(`    ${lvl}: ${count} questions`);
	});
	const seedData: GrammarSeedData = {
		meta: {
			total_questions: allQuestions.length,
			distribution,
			version: '1.0',
			generated_date: new Date().toISOString().split('T')[0],
		},
		questions: allQuestions,
	};

	fs.writeFileSync(outputFile, JSON.stringify(seedData, null, 2), 'utf-8');
}

mergeGrammarBatches().catch((err) => {
	console.error('Merge thất bại:', err);
	process.exit(1);
});
