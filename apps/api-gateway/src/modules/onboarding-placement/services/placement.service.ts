import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../../prisma/prisma.service';

@Injectable()
export class PlacementService {
	constructor(private readonly prismaService: PrismaService) {}

	async startPlacementTest() {}

	async stopPlacementTest() {}

	async completePlacementTest() {}

	async getPlacementTest() {}
}
