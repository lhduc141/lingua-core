import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { PrismaModule } from '../../../../../prisma/prisma.module';

@Module({
	imports: [PrismaModule],
	controllers: [ReportsController, DashboardController],
	providers: [ReportsService, DashboardService],
})
export class ReportsModule {}
