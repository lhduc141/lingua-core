import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { AiClientService } from '@app/ai-client';
import { NotFoundException, PagingDataDto, ResponseDto } from '@app/shared';
import { PrismaService } from '../../../../../../prisma/prisma.service';
import { LookupWordDto } from '../dto/lookup-word.dto';
import { DictEntryLookup } from '../inteface/dict-entry-lookup.interface';
import { CollocationSelect, DictEntrySelect } from '../../../../../../prisma/selects';
import { ListCollocationsDto } from '../dto/list-collocations.dto';
import { AiDictionaryOutput } from '../inteface/ai-dictionary-output.interface';

@Injectable()
export class DictionaryService {
	private readonly logger = new Logger(DictionaryService.name);

	constructor(
		private prisma: PrismaService,
		private aiClient: AiClientService,
	) {}

	async lookup(dto: LookupWordDto) {
		const { word } = dto;

		const directEntry = await this.prisma.dictEntry.findFirst({
			where: { headword: word, lang: 'en', deletedAt: null },
			select: DictEntrySelect.lookup,
		});

		if (directEntry) return ResponseDto.success(Object, this.formatEntry(directEntry));

		const wordForm = await this.prisma.wordForm.findUnique({
			where: { form: word, deletedAt: null },
			select: {
				pos: true,
				entry: { select: DictEntrySelect.lookup },
			},
		});

		if (wordForm) return ResponseDto.success(Object, this.formatEntry(wordForm.entry, word));

		return this.generateFromAi(word);
	}

	async getCollocations(entryId: string, dto: ListCollocationsDto) {
		const entry = await this.prisma.dictEntry.findFirst({
			where: { entryId, deletedAt: null },
			select: { entryId: true },
		});

		if (!entry) throw new NotFoundException('Dictionary entry not found');

		const where = {
			entryId,
			deletedAt: null,
			...(dto.cefrLevel && { cefrLevel: dto.cefrLevel }),
		};

		const [rows, count] = await Promise.all([
			this.prisma.collocation.findMany({
				where,
				select: CollocationSelect.list,
				orderBy: { frequency: 'asc' },
				take: dto.limit,
			}),
			this.prisma.collocation.count({ where }),
		]);

		return ResponseDto.success(Object, new PagingDataDto({ count, rows }));
	}

	private async generateFromAi(word: string) {
		let aiResult: AiDictionaryOutput;

		try {
			aiResult = await this.aiClient.dictionaryLookup({ word });
			if (!aiResult || !aiResult.headword || !aiResult.senses?.length)
				throw new Error('Invalid AI response structure');
		} catch (error) {
			this.logger.error(`AI generation failed for "${word}": ${error.message}`);
			throw new ServiceUnavailableException('Word not found. AI generation failed, please try again later.');
		}

		const entry = await this.persistAiResult(aiResult);
		return ResponseDto.success(Object, this.formatEntry(entry, word !== aiResult.headword ? word : undefined));
	}

	private async persistAiResult(ai: AiDictionaryOutput) {
		this.logger.log(`Persisting AI result for headword: "${ai.headword}"`);

		return this.prisma.$transaction(async (tx) => {
			// Tạo DictEntry (root)
			const entry = await tx.dictEntry.create({
				data: {
					lang: 'en',
					headword: ai.headword,
					pos: ai.pos ?? null,
					ipa: ai.ipa ?? null,
					cefrLevel: ai.cefrLevel ?? null,
					source: 'ai',
				},
			});

			// Tạo WordForms
			if (ai.wordForms?.length) {
				await tx.wordForm.createMany({
					data: ai.wordForms.map((wf) => ({
						entryId: entry.entryId,
						form: wf.form,
						pos: wf.pos,
					})),
					skipDuplicates: true, // tránh conflict nếu word form đã tồn tại
				});
			}

			// Tạo Senses + Examples + Collocations
			for (let i = 0; i < ai.senses.length; i++) {
				const s = ai.senses[i];

				const sense = await tx.dictSense.create({
					data: {
						entryId: entry.entryId,
						order: i + 1,
						shortDef: s.definition,
						viDef: s.viDefinition ?? null,
						synonyms: s.synonyms ?? [],
						antonyms: s.antonyms ?? [],
					},
				});

				if (s.examples?.length) {
					await tx.dictExample.createMany({
						data: s.examples.map((ex) => ({
							senseId: sense.senseId,
							example: ex.text,
							translation: ex.viText ?? null,
						})),
					});
				}

				if (s.collocations?.length) {
					await tx.collocation.createMany({
						data: s.collocations.map((col) => ({
							entryId: entry.entryId,
							senseId: sense.senseId,
							phrase: col.phrase,
							meaning: col.meaning,
							viMeaning: col.viMeaning ?? null,
							example: col.example ?? null,
						})),
					});
				}
			}

			// Re-fetch với đầy đủ relations để trả về
			return tx.dictEntry.findUniqueOrThrow({
				where: { entryId: entry.entryId },
				select: DictEntrySelect.lookup,
			});
		});
	}

	private formatEntry(entry: any, searchedAs?: string): DictEntryLookup {
		return {
			entryId: entry.entryId,
			headword: entry.headword,
			pos: entry.pos,
			ipa: entry.ipa,
			cefrLevel: entry.cefrLevel,
			source: entry.source,
			wordForms: entry.wordForms ?? [],
			senses: (entry.senses ?? []).map((s: any) => ({
				senseId: s.senseId,
				shortDef: s.shortDef,
				viDef: s.viDef,
				synonyms: (s.synonyms as string[]) ?? [],
				antonyms: (s.antonyms as string[]) ?? [],
				examples: (s.examples ?? []).map((ex: any) => ({
					example: ex.example,
					translation: ex.translation,
				})),
				collocations: (s.collocations ?? []).map((col: any) => ({
					collocationId: col.collocationId,
					phrase: col.phrase,
					meaning: col.meaning,
					viMeaning: col.viMeaning,
					example: col.example,
					viExample: col.viExample,
				})),
			})),
			...(searchedAs && { searchedAs }),
		} as DictEntryLookup;
	}
}
