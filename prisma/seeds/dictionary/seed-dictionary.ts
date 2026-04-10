/**
 * seed-dictionary.ts
 *
 * Đọc toàn bộ file JSON trong prisma/seeds/dictionary/data/
 * → Upsert DictEntry + WordForm + DictSense + DictExample + Collocation
 *
 * Idempotent: skip nếu headword đã tồn tại trong DB.
 * WordForm dùng skipDuplicates vì có @@unique([form]).
 *
 * Usage:
 *   pnpm exec tsx prisma/seeds/dictionary/seed-dictionary.ts
 *   pnpm exec tsx prisma/seeds/dictionary/seed-dictionary.ts --level=A1
 *   pnpm exec tsx prisma/seeds/dictionary/seed-dictionary.ts --force
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

interface DictExampleInput {
	// Support cả 2 format: generated JSON (text/viText) và admin API (example/translation)
	text?: string;
	viText?: string;
	example?: string;
	translation?: string;
}

interface DictCollocationInput {
	phrase: string;
	meaning: string;
	viMeaning?: string;
	example?: string;
	viExample?: string;
	frequency?: number;
	cefrLevel?: string;
}

interface DictSenseInput {
	order?: number;
	shortDef: string;
	viDef?: string;
	synonyms?: string[];
	antonyms?: string[];
	examples?: DictExampleInput[];
	collocations?: DictCollocationInput[];
}

interface WordFormInput {
	form: string;
	pos: string;
}

interface DictEntryInput {
	headword: string;
	pos?: string;
	ipa?: string;
	cefrLevel?: string;
	frequency?: number;
	isCommon?: boolean;
	wordForms?: WordFormInput[];
	senses?: DictSenseInput[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseArgs() {
	const args = process.argv.slice(2);
	const levelArg = args
		.find((a) => a.startsWith('--level='))
		?.split('=')[1]
		?.toUpperCase();
	const force = args.includes('--force');
	return { levelArg, force };
}

function getExampleText(ex: DictExampleInput): string {
	return (ex.text ?? ex.example ?? '').trim();
}

function getExampleTranslation(ex: DictExampleInput): string | null {
	return (ex.viText ?? ex.translation ?? null) || null;
}

// ─── Core seeder ──────────────────────────────────────────────────────────────

async function seedEntry(entry: DictEntryInput, force: boolean): Promise<'inserted' | 'skipped' | 'error'> {
	const headword = entry.headword?.toLowerCase().trim();
	if (!headword) return 'error';

	try {
		// Check existing — skip nếu đã có (trừ khi --force)
		const existing = await prisma.dictEntry.findFirst({
			where: { headword, lang: 'en', deletedAt: null },
			select: { entryId: true },
		});

		if (existing && !force) return 'skipped';

		// Nếu force → xóa entry cũ để tạo lại
		if (existing && force) {
			await prisma.dictEntry.update({
				where: { entryId: existing.entryId },
				data: { deletedAt: new Date() },
			});
		}

		await prisma.$transaction(async (tx) => {
			// 1. Tạo DictEntry
			const dictEntry = await tx.dictEntry.create({
				data: {
					lang: 'en',
					headword,
					pos: entry.pos ?? null,
					ipa: entry.ipa ?? null,
					cefrLevel: entry.cefrLevel ?? null,
					frequency: entry.frequency ?? null,
					isCommon: entry.isCommon ?? false,
					source: 'manual',
				},
			});

			// 2. Tạo WordForms (skip duplicate vì @@unique([form]))
			if (entry.wordForms?.length) {
				await tx.wordForm.createMany({
					data: entry.wordForms
						.filter((wf) => wf.form?.trim())
						.map((wf) => ({
							entryId: dictEntry.entryId,
							form: wf.form.toLowerCase().trim(),
							pos: wf.pos,
						})),
					skipDuplicates: true,
				});
			}

			// 3. Tạo Senses + Examples + Collocations
			if (entry.senses?.length) {
				for (let si = 0; si < entry.senses.length; si++) {
					const sense = entry.senses[si];
					if (!sense) continue;

					const dictSense = await tx.dictSense.create({
						data: {
							entryId: dictEntry.entryId,
							order: sense.order ?? si + 1,
							shortDef: sense.shortDef,
							viDef: sense.viDef ?? null,
							synonyms: sense.synonyms?.length ? (sense.synonyms as any) : null,
							antonyms: sense.antonyms?.length ? (sense.antonyms as any) : null,
						},
					});

					// Examples
					if (sense.examples?.length) {
						for (const ex of sense.examples) {
							const exText = getExampleText(ex);
							if (!exText) continue;
							await tx.dictExample.create({
								data: {
									senseId: dictSense.senseId,
									example: exText,
									translation: getExampleTranslation(ex),
								},
							});
						}
					}

					// Collocations
					if (sense.collocations?.length) {
						for (const coll of sense.collocations) {
							if (!coll.phrase?.trim()) continue;
							await tx.collocation.create({
								data: {
									entryId: dictEntry.entryId,
									senseId: dictSense.senseId,
									phrase: coll.phrase.trim(),
									meaning: coll.meaning,
									viMeaning: coll.viMeaning ?? null,
									example: coll.example ?? null,
									viExample: coll.viExample ?? null,
									frequency: coll.frequency ?? null,
									cefrLevel: coll.cefrLevel ?? null,
								},
							});
						}
					}
				}
			}
		});

		return 'inserted';
	} catch (err: any) {
		// Log lỗi nhưng tiếp tục — không dừng toàn bộ seed
		console.error(`    ❌ Error "${headword}": ${err.message}`);
		return 'error';
	}
}

// ─── File loader ──────────────────────────────────────────────────────────────

function loadEntriesFromFile(filePath: string): DictEntryInput[] {
	try {
		const raw = fs.readFileSync(filePath, 'utf-8').trim();
		if (!raw || raw === '[]') return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			console.warn(`    ⚠️  ${path.basename(filePath)}: not an array, skipping`);
			return [];
		}
		return parsed as DictEntryInput[];
	} catch (err: any) {
		console.error(`    ❌ Failed to parse ${path.basename(filePath)}: ${err.message}`);
		return [];
	}
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
	const { levelArg, force } = parseArgs();

	const DATA_DIR = path.resolve(__dirname, 'data');

	if (!fs.existsSync(DATA_DIR)) {
		console.error(`❌ Data directory not found: ${DATA_DIR}`);
		console.error('   Create directory and add JSON batch files first.');
		process.exit(1);
	}

	console.log('🐼 LinguaPanda Dictionary Seeder');
	console.log(`📁 Data dir : ${DATA_DIR}`);
	console.log(`🔍 Level    : ${levelArg ?? 'ALL'}`);
	console.log(`🔁 Force    : ${force}\n`);

	// Đọc tất cả file JSON trong data/
	let files = fs
		.readdirSync(DATA_DIR)
		.filter((f) => f.endsWith('.json'))
		.map((f) => path.join(DATA_DIR, f))
		.sort();

	// Filter theo level nếu có --level=A1
	if (levelArg) {
		files = files.filter((f) => path.basename(f).toLowerCase().startsWith(levelArg.toLowerCase()));
	}

	if (files.length === 0) {
		console.error(`❌ No JSON files found${levelArg ? ` for level ${levelArg}` : ''}`);
		process.exit(1);
	}

	console.log(`📦 Files: ${files.length}`);
	files.forEach((f) => console.log(`   - ${path.basename(f)}`));
	console.log();

	// Merge tất cả entries từ các file
	const allEntries: DictEntryInput[] = [];
	for (const file of files) {
		const entries = loadEntriesFromFile(file);
		if (entries.length > 0) {
			console.log(`  📄 ${path.basename(file)}: ${entries.length} entries`);
			allEntries.push(...entries);
		} else {
			console.log(`  📄 ${path.basename(file)}: empty, skipped`);
		}
	}

	// Deduplicate trong memory theo headword (giữ entry đầu tiên gặp)
	const seen = new Set<string>();
	const uniqueEntries: DictEntryInput[] = [];
	let dupeCount = 0;
	for (const entry of allEntries) {
		const key = entry.headword?.toLowerCase().trim();
		if (!key) continue;
		if (seen.has(key)) {
			dupeCount++;
			continue;
		}
		seen.add(key);
		uniqueEntries.push(entry);
	}

	console.log(`\n📊 Total entries loaded : ${allEntries.length}`);
	if (dupeCount > 0) console.log(`   Duplicates removed   : ${dupeCount}`);
	console.log(`   Unique to process    : ${uniqueEntries.length}`);
	console.log('\n⏳ Seeding...\n');

	// Seed từng entry
	let inserted = 0;
	let skipped = 0;
	let errors = 0;
	const errorWords: string[] = [];

	for (let i = 0; i < uniqueEntries.length; i++) {
		const entry = uniqueEntries[i];
		const result = await seedEntry(entry, force);

		if (result === 'inserted') {
			inserted++;
			if (inserted % 50 === 0) {
				console.log(`  ✅ Progress: ${inserted} inserted (${i + 1}/${uniqueEntries.length})`);
			}
		} else if (result === 'skipped') {
			skipped++;
		} else {
			errors++;
			errorWords.push(entry.headword ?? '?');
		}
	}

	// Final DB count
	const totalInDb = await prisma.dictEntry.count({ where: { deletedAt: null } });

	console.log('\n══════════════════════════════════════');
	console.log('✅ DONE');
	console.log(`   Inserted : ${inserted}`);
	console.log(`   Skipped  : ${skipped} (already in DB)`);
	console.log(`   Errors   : ${errors}`);
	console.log(`   DB total : ${totalInDb} dict entries`);
	if (errorWords.length > 0) {
		console.log(`\n⚠️  Failed words: ${errorWords.slice(0, 20).join(', ')}${errorWords.length > 20 ? '...' : ''}`);
	}
	console.log('══════════════════════════════════════\n');
}

main()
	.catch((e) => {
		console.error('❌ Fatal:', e.message);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
