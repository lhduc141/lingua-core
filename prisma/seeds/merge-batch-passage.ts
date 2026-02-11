import * as fs from 'fs';
import * as path from 'path';

/**
 * Merge 4 batch files into complete passages-questions seed file
 * Usage: npx ts-node scripts/merge-batches-passages.ts
 */

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
			options: Array<{
				text: string;
				isCorrect: boolean;
			}>;
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

async function mergeBatches() {
	console.log('🔄 Merging batch files...\n');

	const inputDir = path.join(__dirname, 'generated');
	const outputFile = path.join(__dirname, 'seed', 'passages-questions-seed.json');

	// Batch files to merge
	const batchFiles = [
		{ file: 'batch1-a1.json', expectedQuestions: 24 },
		{ file: 'batch2-a2.json', expectedQuestions: 30 },
		{ file: 'batch3-b1.json', expectedQuestions: 42 },
		{ file: 'batch4-b2c1.json', expectedQuestions: 55 },
	];

	const allPassages: Passage[] = [];
	const distribution: Record<string, { passages: number; questions: number }> = {};

	let totalQuestions = 0;

	for (const batchInfo of batchFiles) {
		const filePath = path.join(inputDir, batchInfo.file);

		if (!fs.existsSync(filePath)) {
			console.log(`⚠️  File not found: ${batchInfo.file} - Skipping`);
			continue;
		}

		try {
			const content = fs.readFileSync(filePath, 'utf-8');

			// Handle both single-level and multi-level batches
			let batchData: BatchData | { batches: BatchData[] };

			try {
				batchData = JSON.parse(content);
			} catch (parseError) {
				console.error(`❌ Invalid JSON in ${batchInfo.file}`);
				continue;
			}

			// Check if batch4 format (has multiple levels)
			const batches: BatchData[] = 'batches' in batchData ? batchData.batches : [batchData as BatchData];

			for (const batch of batches) {
				const level = batch.level;
				let questionsInBatch = 0;

				console.log(`\n📚 Processing ${level} passages...`);

				for (const passage of batch.passages) {
					// Validate passage
					if (!passage.passageText || !passage.questions || passage.questions.length === 0) {
						console.log(`  ⚠️  Invalid passage structure, skipping`);
						continue;
					}

					// Validate word count
					const wordCount = passage.passageText.split(/\s+/).length;
					const expectedRange = getExpectedWordCount(level);
					if (wordCount < expectedRange.min || wordCount > expectedRange.max) {
						console.log(
							`  ⚠️  Passage word count ${wordCount} outside range [${expectedRange.min}-${expectedRange.max}]`,
						);
					}

					// Validate questions
					for (const question of passage.questions) {
						if (!question.translations?.en?.options || question.translations.en.options.length !== 4) {
							console.log(`    ⚠️  Question ${question.questionNumber} invalid options`);
							continue;
						}

						const correctCount = question.translations.en.options.filter((opt) => opt.isCorrect).length;
						if (correctCount !== 1) {
							console.log(
								`    ⚠️  Question ${question.questionNumber} has ${correctCount} correct answers (should be 1)`,
							);
						}
					}

					allPassages.push(passage);
					questionsInBatch += passage.questions.length;

					console.log(
						`  ✅ Passage ${passage.passageMetadata.passageNumber}: ${passage.passageMetadata.topic} (${wordCount} words, ${passage.questions.length} questions)`,
					);
				}

				// Update distribution
				if (!distribution[level]) {
					distribution[level] = { passages: 0, questions: 0 };
				}
				distribution[level].passages += batch.passages.length;
				distribution[level].questions += questionsInBatch;

				totalQuestions += questionsInBatch;

				console.log(`  📊 ${level} total: ${batch.passages.length} passages, ${questionsInBatch} questions`);
			}
		} catch (error) {
			console.error(`❌ Error processing ${batchInfo.file}:`, error.message);
		}
	}

	console.log('\n' + '═'.repeat(60));
	console.log('📊 FINAL STATISTICS:\n');
	console.log(`Total passages: ${allPassages.length}`);
	console.log(`Total questions: ${totalQuestions}\n`);

	console.log('Distribution by level:');
	Object.entries(distribution)
		.sort(([a], [b]) => a.localeCompare(b))
		.forEach(([level, stats]) => {
			console.log(`  ${level}: ${stats.passages} passages, ${stats.questions} questions`);
		});

	// Create complete seed data
	const seedData: CompleteSeedData = {
		meta: {
			total_passages: allPassages.length,
			total_questions: totalQuestions,
			distribution,
			version: '1.0',
			generated_date: new Date().toISOString().split('T')[0],
		},
		passages: allPassages,
	};

	// Ensure output directory exists
	const outputDir = path.dirname(outputFile);
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	// Write to file
	fs.writeFileSync(outputFile, JSON.stringify(seedData, null, 2), 'utf-8');

	console.log('\n' + '═'.repeat(60));
	console.log(`✅ Merged file saved to: ${outputFile}`);
	console.log('\n🚀 Next step: Run seed script');
	console.log('   npx ts-node scripts/seed-passages-questions.ts');
}

function getExpectedWordCount(level: string): { min: number; max: number } {
	const ranges: Record<string, { min: number; max: number }> = {
		A1: { min: 50, max: 80 },
		A2: { min: 100, max: 120 },
		B1: { min: 150, max: 180 },
		B2: { min: 200, max: 250 },
		C1: { min: 250, max: 300 },
	};
	return ranges[level] || { min: 0, max: 1000 };
}

mergeBatches().catch((error) => {
	console.error('❌ Merge failed:', error);
	process.exit(1);
});
