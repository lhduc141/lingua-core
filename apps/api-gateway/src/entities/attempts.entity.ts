import { BelongsTo, Column, CreatedAt, DataType, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { Assessments } from './assessments.entity';
import { Assets } from './assets.entity';
import { Questions } from './questions.entity';
import { Users } from '../modules/auth/entities/users.entity';

@Table({ tableName: 'attempts' })
export class Attempts extends Model<Attempts> {
	@Column({ type: DataType.UUID, field: 'attempt_id', primaryKey: true, allowNull: false })
	declare attemptId: string | null;

	@ForeignKey(() => Users)
	@Column({ type: DataType.UUID, field: 'user_id', allowNull: false })
	declare userId: string;

	@ForeignKey(() => Assessments)
	@Column({ type: DataType.UUID, field: 'assessment_id', allowNull: false })
	declare assessmentId: string;

	@ForeignKey(() => Questions)
	@Column({ type: DataType.UUID, field: 'question_id', allowNull: false })
	declare questionId: string;

	@Column({ type: DataType.INTEGER, field: 'section_position', allowNull: true })
	declare sectionPosition: number | null;

	@Column({ type: DataType.DECIMAL, field: 'score', allowNull: true })
	declare score: number | null;

	@Column({ type: DataType.BOOLEAN, field: 'correct', allowNull: true })
	declare correct: boolean | null;

	@ForeignKey(() => Assets)
	@Column({ type: DataType.UUID, field: 'input_asset_id', allowNull: true })
	declare inputAssetId: string;

	@ForeignKey(() => Assets)
	@Column({ type: DataType.UUID, field: 'transcript_asset_id', allowNull: true })
	declare transcriptAssetId: string;

	@ForeignKey(() => Assets)
	@Column({ type: DataType.UUID, field: 'output_asset_id', allowNull: true })
	declare outputAssetId: string;

	@ForeignKey(() => Users)
	@Column({ type: DataType.UUID, field: 'rater_id', allowNull: true })
	declare raterId: string;

	@CreatedAt
	@Column({ type: DataType.DATE, field: 'created_at', allowNull: false })
	declare createdAt: Date;

	@UpdatedAt
	@Column({ type: DataType.DATE, field: 'updated_at', allowNull: false })
	declare updatedAt: Date;

	@BelongsTo(() => Users, { foreignKey: 'userId' })
	declare user?: Users;

	@BelongsTo(() => Assessments, { foreignKey: 'assessmentId' })
	declare assessment?: Assessments;

	@BelongsTo(() => Questions, { foreignKey: 'questionId' })
	declare question?: Questions;

	@BelongsTo(() => Assets, { foreignKey: 'inputAssetId' })
	declare asset?: Assets;

	@BelongsTo(() => Assets, { foreignKey: 'transcriptAssetId' })
	declare transcriptAssetRef?: Assets;

	@BelongsTo(() => Assets, { foreignKey: 'outputAssetId' })
	declare outputAssetRef?: Assets;

	@BelongsTo(() => Users, { foreignKey: 'raterId' })
	declare userRef?: Users;
}
