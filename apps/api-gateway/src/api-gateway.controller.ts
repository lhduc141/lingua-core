import { Controller, Get } from '@nestjs/common';
import { ApiGatewayService } from './api-gateway.service';
import { ApiTag } from './decorators/api-tag.decorator';

@Controller()
@ApiTag({ name: 'app' })
export class ApiGatewayController {
	constructor(private readonly appService: ApiGatewayService) {}

	@Get('health/db')
	async checkHealthDb() {
		return this.appService.checkHealthDb();
	}
}
