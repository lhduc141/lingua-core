import { Exclude, Expose, Transform, Type } from 'class-transformer';

@Exclude()
export class OnboardingSurveyDto {
	@Expose() surveyId: string;
	@Expose() userId: string;

	// TIER 1
	@Expose() primaryGoal: string | null;
	@Expose() plannedStudyHoursPerWeek: number | null;
	@Expose() primaryFocusSkills: string[];
	@Expose() availableDays: string[];

	// TIER 2
	@Expose()
	@Transform(({ value }) => (value ? value.toISOString().slice(0, 10) : null), { toPlainOnly: true })
	targetDeadlineDate: Date | null;

	@Expose() targetGoal: string | null;
	@Expose() selfAssessedLevel: string | null;
	@Expose() usageContext: string | null;
	@Expose() difficulties: string | null;

	// TIER 3
	@Expose() additionalContext: string | null;
	@Expose() yearsStudied: number | null;
	@Expose() previousLearningExperience: string | null;

	// CERTIFICATION
	@Expose() targetCertification: string | null;
	@Expose() targetScore: string | null;

	// Timestamps
	@Expose() completedAt: Date | null;
}

@Exclude()
export class OnboardingSurveyAnswerDto {
	@Expose()
	questionKey: string;

	@Expose()
	answerValue: string;

	@Expose()
	questionOrder: number;
}
