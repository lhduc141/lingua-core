import { Module } from '@nestjs/common';
import { OnboardingService } from './services/onboarding.service';
import { PlacementService } from './services/placement.service';
import { OnboardingController } from './controllers/onboarding.controller';
import { PlacementController } from './controllers/placement.controller';
import { CatEngineService } from './services/cat-engine.service';

@Module({
	controllers: [OnboardingController, PlacementController],
	providers: [OnboardingService, PlacementService, CatEngineService],
})
export class OnboardingPlacementModule {}
