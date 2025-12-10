import { Module } from '@nestjs/common';
import { APP_GUARD, RouterModule } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { CmsModule } from './cms/cms.module';
import { ExamsModule } from './exams/exams.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { ReportsModule } from './reports/reports.module';
import { PlansModule } from './plans/plans.module';
import { SrsModule } from './srs/srs.module';
import { DictionaryModule } from './dictionary/dictionary.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UsersModule } from './users/users.module';
import { AuthGuard } from '../guards/auth.guard';
import { OnboardingModule } from './onboarding/onboarding.module';
import { AiClientModule } from './ai-client/ai-client.module';

const modules: any[] = [
	AuthModule,
	CmsModule,
	ExamsModule,
	AssessmentsModule,
	ReportsModule,
	PlansModule,
	SrsModule,
	DictionaryModule,
	NotificationsModule,
	UsersModule,
	OnboardingModule,
	AiClientModule,
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
