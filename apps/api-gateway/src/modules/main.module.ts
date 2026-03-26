import { Module } from '@nestjs/common';
import { APP_GUARD, RouterModule } from '@nestjs/core';
import { AuthGuard } from '../guards/auth.guard';
import { AdminModule } from './admin/admin.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { AuthModule } from './auth/auth.module';
import { DictionaryModule } from './dictionary/dictionary.module';
import { LearningPlanModule } from './learning-plan/learning-plan.module';
import { LearningModule } from './learning/learning.module';
import { OnboardingPlacementModule } from './onboarding-placement/onboarding-placement.module';
import { ReportsModule } from './reports/reports.module';
import { UsersModule } from './users/users.module';

const modules: any[] = [
	AuthModule,
	AssessmentsModule,
	ReportsModule,
	DictionaryModule,
	UsersModule,
	AdminModule,
	LearningModule,
	OnboardingPlacementModule,
	LearningPlanModule,
];

@Module({
	imports: [
		...modules,
		RouterModule.register([
			{
				path: '/api',
				children: modules.map((module) => ({
					path: '/',
					module: module,
				})),
			},
		]),
	],
	providers: [
		{
			provide: APP_GUARD,
			useClass: AuthGuard,
		},
	],
	exports: [AuthModule],
})
export class MainModule {}
