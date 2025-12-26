import { Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { DictionaryService } from './dictionary.service';

@Controller('dictionary')
export class DictionaryController {
	constructor(private readonly dictionaryService: DictionaryService) {}

	//Search

	@Get('search')
	async searchDictionary() {}

	//Dictionary Entry CRUD (optional)

	@Post()
	async createEntry() {}

	@Get(':id')
	async getEntry() {}

	@Patch(':id')
	async updateEntry() {}

	@Delete(':id')
	async deleteEntry() {}

	//AI Fallback

	@Post('ai/fetch')
	async aiDictionaryLookup() {}
}
