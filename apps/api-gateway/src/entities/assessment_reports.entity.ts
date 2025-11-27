import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { Assessments } from './assessments.entity';
import { Assets } from './assets.entity';
import { Users } from '../modules/auth/entities/users.entity';

@Table({ tableName: 'assessment_reports' })
export class AssessmentReports extends Model<AssessmentReports> {
  @Column({ type: DataType.UUID, field: 'report_id', primaryKey: true, allowNull: false })
  declare reportId: string | null;

  @ForeignKey(() => Assessments)
  @Column({ type: DataType.UUID, field: 'assessment_id', allowNull: false })
  declare assessmentId: string;

  @ForeignKey(() => Users)
  @Column({ type: DataType.UUID, field: 'user_id', allowNull: false })
  declare userId: string;

  @Column({ type: DataType.TEXT, field: 'kind', allowNull: false })
  declare kind: string;

  @Column({ type: DataType.TEXT, field: 'cefr', allowNull: true })
  declare cefr: string | null;

  @Column({ type: DataType.JSONB, field: 'strengths_json', allowNull: false })
  declare strengthsJson: any;

  @Column({ type: DataType.JSONB, field: 'weaknesses_json', allowNull: false })
  declare weaknessesJson: any;

  @Column({ type: DataType.JSONB, field: 'plan_json', allowNull: false })
  declare planJson: any;

  @Column({ type: DataType.TEXT, field: 'rubric_version', allowNull: true })
  declare rubricVersion: string | null;

  @Column({ type: DataType.TEXT, field: 'display_locale', allowNull: true })
  declare displayLocale: string | null;

  @ForeignKey(() => Assets)
  @Column({ type: DataType.UUID, field: 'explanations_asset_id', allowNull: true })
  declare explanationsAssetId: string;

  @Column({ type: DataType.INTEGER, field: 'report_version', allowNull: false })
  declare reportVersion: number;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at', allowNull: false })
  declare createdAt: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at', allowNull: false })
  declare updatedAt: Date;

  @BelongsTo(() => Assessments, { foreignKey: 'assessmentId' })
  declare assessment?: Assessments;

  @BelongsTo(() => Users, { foreignKey: 'userId' })
  declare user?: Users;

  @BelongsTo(() => Assets, { foreignKey: 'explanationsAssetId' })
  declare asset?: Assets;

}