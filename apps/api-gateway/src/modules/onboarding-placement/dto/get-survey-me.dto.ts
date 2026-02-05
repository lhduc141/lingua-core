import { Exclude, Expose, Transform, Type } from 'class-transformer';

@Exclude()
export class OnboardingSurveyDto {
	@Expose()
	surveyId: string;

	@Expose()
	userId: string;

	@Expose()
	targetGoal: string;

	@Expose()
	@Transform(({ value }) => (value ? value.toISOString().slice(0, 10) : null), {
		toPlainOnly: true,
	})
	targetDeadlineDate: Date | null;

	@Expose()
	plannedStudyHoursPerWeek: number;

	@Expose()
	primaryFocusSkills: string[];

	@Expose()
	selfAssessedLevel: string;

	@Expose()
	usageContext: string | null;

	@Expose()
	difficulties: string | null;

	@Expose()
	metaJson: any;

	@Expose()
	@Type(() => OnboardingSurveyAnswerDto)
	answers: OnboardingSurveyAnswerDto[];
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
