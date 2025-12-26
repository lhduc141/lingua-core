import { Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { SrsService } from './srs.service';

@Controller('srs')
export class SrsController {
	constructor(private readonly srsService: SrsService) {}

	//Collections

	@Get('collections')
	async getCollections() {}

	@Post('collections')
	async createCollection() {}

	@Patch('collections/:id')
	async updateCollection() {}

	@Delete('collections/:id')
	async deleteCollection() {}

	//Cards

	@Post('collections/:collectionId/cards')
	async addCardToCollection() {}

	@Get('cards/:id')
	async getCard() {}

	@Patch('cards/:id')
	async updateCard() {}

	@Delete('cards/:id')
	async deleteCard() {}

	//Review Flow

	@Get('reviews/due')
	async getDueCards() {}

	@Post('reviews/:cardId')
	async reviewCard() {}
}
