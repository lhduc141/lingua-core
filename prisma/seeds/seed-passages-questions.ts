import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

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

interface SeedData {
	meta: {
		total_passages: number;
		total_questions: number;
		distribution: Record<string, { passages: number; questions: number }>;
		version: string;
		generated_date: string;
	};
	passages: Passage[];
}

async function seedPassagesQuestions() {
	const seedFilePath = path.join(__dirname, 'passages-questions-seed.json');

	if (!fs.existsSync(seedFilePath)) process.exit(1);
	const seedData: SeedData = JSON.parse(fs.readFileSync(seedFilePath, 'utf-8'));

	let passagesCreated = 0;
	let questionsCreated = 0;
	let passagesSkipped = 0;
	let questionsSkipped = 0;

	for (const [passageIndex, passageData] of seedData.passages.entries()) {
		const passageNum = passageIndex + 1;
		const level = passageData.passageMetadata.level;
		const topic = passageData.passageMetadata.topic;

		try {
			const passage = await prisma.passage.create({
				data: {
					title: `${level} - ${topic}`, // ← Tạo title từ metadata
					content: passageData.passageText, // ← Đổi tên field
					cefrLevel: level, // ← Đổi tên field
					topic: topic, // ← Thêm
					wordCount: passageData.passageMetadata.wordCount, // ← Thêm
					sourceTag: 'placement_test_v1', // ← Thêm
					status: 'published', // ← Sử dụng field mới
				},
			});

			passagesCreated++;

			for (const [questionIndex, questionData] of passageData.questions.entries()) {
				try {
					const question = await prisma.question.create({
						data: {
							passageId: passage.passageId, // Link to passage
							skill: questionData.skill,
							type: questionData.type as any,
							difficulty: questionData.difficulty,
							status: questionData.status as any,
							sourceTag: questionData.sourceTag,
							examKind: 'generic',
							irtDifficulty: null,
							irtDiscrimination: null,
							irtGuessing: null,
						},
					});

					await prisma.questionTranslation.create({
						data: {
							questionId: question.questionId,
							locale: 'en',
							stemText: questionData.translations.en.stemText,
							explanation: questionData.translations.en.explanation,
						},
					});

					for (const [optionIndex, optionData] of questionData.translations.en.options.entries()) {
						const option = await prisma.questionOption.create({
							data: {
								questionId: question.questionId,
								isCorrect: optionData.isCorrect,
								position: optionIndex + 1,
							},
						});

						await prisma.optionTranslation.create({
							data: {
								optionId: option.optionId,
								locale: 'en',
								optionText: optionData.text,
							},
						});
					}

					questionsCreated++;
				} catch (error) {
					questionsSkipped++;
				}
			}
		} catch (error) {
			passagesSkipped++;
		}
	}
}

seedPassagesQuestions()
	.catch(() => {
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
