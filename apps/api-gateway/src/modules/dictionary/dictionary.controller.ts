import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { JwtPayloadDto } from '@app/jwt';
import { AuthGuard } from '../../guards/auth.guard';
import { ReqUser } from '../../decorators/req-user.decorator';
import { LookupWordDto } from './dto/lookup-word.dto';
import { ListCollocationsDto } from './dto/list-collocations.dto';
import { SaveVocabularyDto } from './dto/save-vocabulary.dto';
import { ListVocabularyDto } from './dto/list-vocabulary.dto';
import { UpdateVocabularyDto } from './dto/update-vocabulary.dto';
import { DictionaryService } from './service/dictionary.service';
import { VocabularyService } from './service/vocabulary.service';

@ApiTags('Dictionary')
@Controller()
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class DictionaryController {
	constructor(
		private readonly dictionaryService: DictionaryService,
		private readonly vocabularyService: VocabularyService,
	) {}

	@Get('dictionary/lookup')
	@ApiOperation({ summary: 'Tra từ — DB lookup → WordForm → AI fallback' })
	@ApiOkResponse({ description: 'Dictionary entry' })
	lookup(@Query() query: LookupWordDto) {
		return this.dictionaryService.lookup(query);
	}

	@Get('dictionary/:entryId/collocations')
	@ApiOperation({ summary: 'Lấy danh sách collocations của một từ' })
	@ApiOkResponse({ description: 'Collocation list' })
	@ApiNotFoundResponse({ description: 'Entry not found' })
	getCollocations(@Param('entryId', ParseUUIDPipe) entryId: string, @Query() query: ListCollocationsDto) {
		return this.dictionaryService.getCollocations(entryId, query);
	}

	@Post('vocabulary/save')
	@ApiOperation({ summary: 'Lưu từ vào danh sách từ vựng cá nhân' })
	@ApiOkResponse({ description: 'Saved' })
	@ApiNotFoundResponse({ description: 'Entry not found' })
	save(@ReqUser() user: JwtPayloadDto, @Body() dto: SaveVocabularyDto) {
		return this.vocabularyService.save(user.userId, dto);
	}

	@Get('vocabulary')
	@ApiOperation({ summary: 'Danh sách từ vựng đã lưu' })
	@ApiOkResponse({ description: 'Paginated vocabulary list' })
	list(@ReqUser() user: JwtPayloadDto, @Query() query: ListVocabularyDto) {
		return this.vocabularyService.list(user.userId, query);
	}

	@Patch('vocabulary/:id')
	@ApiOperation({ summary: 'Cập nhật ghi chú từ vựng' })
	@ApiNotFoundResponse({ description: 'Vocabulary item not found' })
	update(@ReqUser() user: JwtPayloadDto, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVocabularyDto) {
		return this.vocabularyService.update(user.userId, id, dto);
	}

	@Delete('vocabulary/:id')
	@ApiOperation({ summary: 'Xóa từ khỏi danh sách từ vựng' })
	@ApiNotFoundResponse({ description: 'Vocabulary item not found' })
	remove(@ReqUser() user: JwtPayloadDto, @Param('id', ParseUUIDPipe) id: string) {
		return this.vocabularyService.remove(user.userId, id);
	}
}
