import { Expose } from 'class-transformer';

// Update onboarding status types (UPDATED 17/03/26)
export type OnboardingStatus = 'completed' | 'skipped' | 'pending';

export class ProfileMeDto {
	@Expose() userId: string;
	@Expose() email: string;
	@Expose() displayName: string;
	@Expose() avatarUrl: string | null;
	@Expose() cefrLevel: string | null;

	@Expose() surveyStatus: OnboardingStatus;
	@Expose() placementStatus: OnboardingStatus;

	// @Expose() surveyCompleted: boolean;
	// @Expose() placementCompleted: boolean;

	@Expose() isAdmin: boolean;
	@Expose() createdAt: Date;
}
