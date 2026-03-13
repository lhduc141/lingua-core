import { Expose } from 'class-transformer';

export class ProfileMeDto {
	@Expose() userId: string;
	@Expose() email: string;
	@Expose() displayName: string;
	@Expose() avatarUrl: string | null;
	@Expose() cefrLevel: string | null;
	@Expose() surveyCompleted: boolean;
	@Expose() placementCompleted: boolean;
	@Expose() isAdmin: boolean;
	@Expose() createdAt: Date;
}
