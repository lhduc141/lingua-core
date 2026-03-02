import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, NotFoundException, PagingDataDto, ResponseDto } from '@app/shared';
import { PrismaService } from '../../../../../../prisma/prisma.service';
import { SaveVocabularyDto } from '../dto/save-vocabulary.dto';
import { ListVocabularyDto } from '../dto/list-vocabulary.dto';
import { DictEntrySelect, VocabularySelect } from '../../../../../../prisma/selects';
import { UpdateVocabularyDto } from '../dto/update-vocabulary.dto';

@Injectable()
export class VocabularyService {
	private readonly logger = new Logger(VocabularyService.name);

	constructor(private prisma: PrismaService) {}

	async save(userId: string, dto: SaveVocabularyDto) {
		const entry = await this.prisma.dictEntry.findFirst({
			where: { entryId: dto.entryId, deletedAt: null },
			select: DictEntrySelect.minimal,
		});

		if (!entry) throw new NotFoundException('Dictionary entry not found');

		const existing = await this.prisma.userVocabulary.findUnique({
			where: { userId_entryId: { userId, entryId: dto.entryId } },
			select: VocabularySelect.idWithDeletedAt,
		});

		if (existing) {
			if (!existing.deletedAt) throw new BadRequestException('Word already saved to vocabulary');

			const restored = await this.prisma.userVocabulary.update({
				where: { id: existing.id },
				data: {
					deletedAt: null,
					note: dto.note ?? null,
					context: dto.context ?? null,
					addedAt: new Date(),
				},
				select: VocabularySelect.idOnly,
			});

			return ResponseDto.success(Object, { id: restored.id }, 'Word saved to vocabulary');
		}

		const vocab = await this.prisma.userVocabulary.create({
			data: {
				userId,
				entryId: dto.entryId,
				status: 'new',
				note: dto.note ?? null,
				context: dto.context ?? null,
			},
			select: VocabularySelect.idOnly,
		});

		return ResponseDto.success(Object, { id: vocab.id }, 'Word saved to vocabulary');
	}

	async list(userId: string, dto: ListVocabularyDto) {
		const { pageIndex, pageSize } = dto;

		const where = { userId, deletedAt: null };

		const [rows, count] = await Promise.all([
			this.prisma.userVocabulary.findMany({
				where,
				select: VocabularySelect.list,
				orderBy: { addedAt: 'desc' },
				skip: (pageIndex - 1) * pageSize,
				take: pageSize,
			}),
			this.prisma.userVocabulary.count({ where }),
		]);

		return ResponseDto.success(Object, new PagingDataDto({ count, rows }));
	}

	async update(userId: string, id: string, dto: UpdateVocabularyDto) {
		const vocab = await this.prisma.userVocabulary.findFirst({
			where: { id, userId, deletedAt: null },
			select: VocabularySelect.idOnly,
		});

		if (!vocab) throw new NotFoundException('Vocabulary item not found');

		await this.prisma.userVocabulary.update({
			where: { id },
			data: {
				...(dto.note !== undefined && { note: dto.note }),
				...(dto.context !== undefined && { context: dto.context }),
			},
		});

		return ResponseDto.success(Object, null, 'Updated successfully');
	}

	async remove(userId: string, id: string) {
		const vocab = await this.prisma.userVocabulary.findFirst({
			where: { id, userId, deletedAt: null },
			select: VocabularySelect.idOnly,
		});

		if (!vocab) throw new NotFoundException('Vocabulary item not found');

		await this.prisma.userVocabulary.update({
			where: { id },
			data: { deletedAt: new Date() },
		});

		return ResponseDto.success(Object, null, 'Removed from vocabulary');
	}
}
