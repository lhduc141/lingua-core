import { Controller } from '@nestjs/common';
import { SrsService } from './srs.service';

@Controller('srs')
export class SrsController {
  constructor(private readonly srsService: SrsService) {}
}
